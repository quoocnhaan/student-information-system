"""Elapsed deadlines, checked responses, and worker exit policy."""

import asyncio
import json
import logging
from unittest.mock import AsyncMock

import httpx
import pytest

from app.config import Settings
from app.infrastructure.surreal import CheckedClient, SurrealDatabase, SurrealDatabaseError
from app.jobs.routes import Envelope
from app.worker.core import FailurePersistenceError, execute
from app.worker.index import embed_texts
from app.observability.logging import JsonFormatter
from test_worker import Database, Handler, Message, JOB_ID


def test_commit_context_and_database_causes_are_serialized():
    record = logging.makeLogRecord({
        "msg": "index_commit_failed", "levelname": "ERROR", "job_id": JOB_ID,
        "claim_id": "claim", "chunk_count": 16, "duration_seconds": 0.2,
        "database_cause": "transaction conflict", "document_text": "private text",
        "embedding": [0.1] * 768,
    })
    payload = json.loads(JsonFormatter().format(record))
    assert payload["job_id"] == JOB_ID and payload["claim_id"] == "claim"
    assert payload["chunk_count"] == 16 and payload["duration_seconds"] == 0.2
    assert payload["database_cause"] == "transaction conflict"
    assert "document_text" not in payload and "embedding" not in payload


def test_checked_client_rejects_later_error_and_bounds_hanging_calls():
    async def run():
        sdk = AsyncMock()
        sdk.query_raw.return_value = {"result": [
            {"status": "OK", "result": None},
            {"status": "ERR", "result": "transaction write failed"},
        ]}
        client = CheckedClient(sdk, Settings(database_timeout_seconds=0.01, _env_file=None))
        with pytest.raises(SurrealDatabaseError, match="transaction write failed"):
            await client.query("BEGIN TRANSACTION; RETURN true; COMMIT TRANSACTION;")

        async def hang(*args):
            await asyncio.sleep(10)

        sdk.query_raw.side_effect = hang
        with pytest.raises(TimeoutError):
            await client.query("SELECT * FROM job;")
        sdk.close.side_effect = hang
        with pytest.raises(TimeoutError):
            await client.close()

    asyncio.run(run())


def test_processing_deadline_fails_without_redelivery():
    class Hanging(Handler):
        async def process(self, *args):
            self.calls += 1
            await asyncio.sleep(10)

    database, message, handler = Database(), Message(), Hanging("index_document")
    asyncio.run(execute(Envelope(1, handler.type, JOB_ID), handler, database, message,
                        Settings(index_processing_timeout_seconds=0.01, _env_file=None)))
    assert message.acked and not message.nacked
    assert len(database.failed) == handler.calls == 1


def test_model_faults_are_not_automatically_retried():
    async def run():
        calls = 0

        async def fault(request):
            nonlocal calls
            calls += 1
            raise httpx.ConnectError("model unavailable")

        async with httpx.AsyncClient(transport=httpx.MockTransport(fault)) as client:
            with pytest.raises(httpx.ConnectError):
                await embed_texts(["text"], Settings(_env_file=None), client)
        assert calls == 1

        client = AsyncMock()

        async def hang(*args, **kwargs):
            await asyncio.sleep(10)

        client.post.side_effect = hang
        with pytest.raises(TimeoutError):
            await embed_texts(["text"], Settings(embedding_timeout_seconds=0.01, _env_file=None), client)

    asyncio.run(run())


def test_failure_persistence_outage_requires_worker_exit():
    class Broken(Handler):
        async def process(self, *args):
            raise RuntimeError("processing fault")

    database = SurrealDatabase(Settings(_env_file=None))
    database.claim_job = AsyncMock(return_value={"id": JOB_ID})
    database.close = AsyncMock()
    database.reconcile_failure = AsyncMock(side_effect=TimeoutError())
    with pytest.raises(FailurePersistenceError):
        asyncio.run(execute(Envelope(1, "index_document", JOB_ID), Broken("index_document"), database, Message()))
    database.reconcile_failure.assert_awaited_once()


def test_failed_startup_recovery_never_connects_to_broker(monkeypatch):
    from app.worker import __main__ as worker

    database = AsyncMock()
    database.recover_abandoned_jobs.side_effect = TimeoutError()
    broker = AsyncMock()
    monkeypatch.setattr(worker, "get_settings", lambda: Settings(worker_id="index-1", _env_file=None))
    monkeypatch.setattr(worker, "SurrealDatabase", lambda settings: database)
    monkeypatch.setattr(worker.aio_pika, "connect_robust", broker)
    with pytest.raises(TimeoutError):
        asyncio.run(worker.run())
    broker.assert_not_awaited()
    database.close.assert_awaited_once()
