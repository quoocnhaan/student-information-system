"""Worker routing, claiming, and OCR deadline regressions."""

import asyncio
from unittest.mock import AsyncMock

import pytest

from app.config import Settings
from app.jobs.routes import Envelope
from app.worker.core import Registry, execute
from app.worker.ocr import OcrPdfHandler

JOB_ID = "job:job_" + "a" * 32


class Handler:
    version = 1

    def __init__(self, job_type):
        self.type = job_type
        self.calls = 0

    async def process(self, job_id, claim_id, claimed):
        self.calls += 1


class Database:
    def __init__(self):
        self.claimed = False
        self.failed = []

    async def claim_job(self, job_id, claim_id, job_type):
        if self.claimed:
            return None
        self.claimed = True
        payload = {} if job_type == "ocr_pdf" else {"index_input_id": "index_input:index_input_" + "b" * 32, "confirmation_fingerprint": "c" * 64}
        return {"id": job_id, "type": job_type, "payload": payload}

    async def fail_job(self, job_id, claim_id, error):
        self.failed.append(error)


class Message:
    def __init__(self):
        self.acked = False
        self.nacked = False

    async def ack(self):
        self.acked = True

    async def nack(self, *, requeue):
        self.nacked = requeue


def test_registry_routes_by_type_and_version_and_claims_once() -> None:
    registry = Registry()
    first, second = Handler("ocr_pdf"), Handler("other_type")
    registry.register(first)
    registry.register(second)
    with pytest.raises(ValueError, match="Duplicate"):
        registry.register(first)
    assert registry.get(Envelope(1, "ocr_pdf", JOB_ID)) is first
    assert registry.get(Envelope(1, "other_type", JOB_ID)) is second
    assert registry.get(Envelope(2, "ocr_pdf", JOB_ID)) is None
    database = Database()
    messages = [Message(), Message()]

    async def run():
        for message in messages:
            await execute(Envelope(1, "ocr_pdf", JOB_ID), first, database, message)

    asyncio.run(run())
    assert first.calls == 1
    assert all(message.acked for message in messages)


def test_database_claim_error_nacks_for_redelivery() -> None:
    class Broken(Database):
        async def claim_job(self, *args):
            raise RuntimeError("database unavailable")

    message = Message()
    asyncio.run(execute(Envelope(1, "ocr_pdf", JOB_ID), Handler("ocr_pdf"), Broken(), message))
    assert message.nacked is True
    assert message.acked is False


def test_elapsed_ocr_deadline() -> None:
    class HangingClient:
        async def post(self, url, json):
            await asyncio.sleep(1)

    handler = OcrPdfHandler(Settings(ocr_timeout_seconds=0.01, _env_file=None), None, None)
    with pytest.raises(RuntimeError, match="LM Studio OCR request failed"):
        asyncio.run(handler._extract_page(HangingClient(), b"image"))


def test_ocr_detects_metadata_from_raw_text_and_completes_into_review(monkeypatch):
    from app.worker import ocr

    database, objects = AsyncMock(), AsyncMock()
    database.get_document.return_value = {"source": {"object_key": "test.pdf", "original_filename": "test.pdf"}}
    objects.get_size.return_value = 10
    objects.get_bytes.return_value = b"test"
    monkeypatch.setattr(ocr, "_page_count", lambda _: 1)
    monkeypatch.setattr(ocr, "_render", lambda *_: b"image")
    captured = []
    class Detector:
        def detect(self, pages, filename):
            captured.append((pages[0].model_dump(), filename))
            return {"title": "Detected raw title"}
    monkeypatch.setattr(ocr, "DocumentMetadataDetector", Detector)
    handler = OcrPdfHandler(Settings(_env_file=None), database, objects)
    handler._extract_page = AsyncMock(return_value="Raw text")
    result = asyncio.run(handler.process(JOB_ID, "claim", {"document_id": "document:doc_" + "b" * 32, "payload": {}}))
    assert result is None
    assert captured == [({"page": 1, "raw_text": "Raw text"}, "test.pdf")]
    handler._extract_page.assert_awaited_once()
    database.apply_ocr_result.assert_awaited_once_with(
        "doc_" + "b" * 32, "ocr_job_" + "a" * 32,
        [{"page": 1, "raw_text": "Raw text"}], {"title": "Detected raw title"}, JOB_ID, "claim",
    )
    assert all(set(call.args[2]) == {"step", "progress"} for call in database.job_progress.await_args_list)
