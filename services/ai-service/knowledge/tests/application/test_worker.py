"""Worker routing, claiming, and OCR deadline regressions."""

import asyncio

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
        return {"id": job_id, "type": job_type}

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
