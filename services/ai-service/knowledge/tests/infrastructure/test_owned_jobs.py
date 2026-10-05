"""Service-owned job contract and replay regressions."""

import asyncio
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase
from app.jobs.publisher import JobPublisher
from app.jobs.routes import Envelope

JOB_ID = "job:job_" + "a" * 32


def test_envelope_round_trip_and_validation() -> None:
    message = Envelope(1, "ocr_pdf", JOB_ID)
    assert Envelope.decode(message.encode()) == message
    for body in (b"{}", b"not json", b'{"version":2,"type":"ocr_pdf","job_id":"' + JOB_ID.encode() + b'"}'):
        with pytest.raises(ValueError):
            Envelope.decode(body)


def test_disconnected_publish_returns_without_raising() -> None:
    publisher = JobPublisher(SimpleNamespace(), Settings(_env_file=None))
    asyncio.run(publisher.publish({"id": JOB_ID, "type": "ocr_pdf"}))


def test_replay_pages_through_every_queued_job() -> None:
    class Store:
        async def queued_jobs_after(self, cursor, limit):
            rows = [
                {"id": "job:job_" + format(index, "032x"), "type": "ocr_pdf"}
                for index in range(5)
            ]
            return [row for row in rows if cursor is None or row["id"].split(":")[1] > cursor][:limit]

    publisher = JobPublisher(Store(), Settings(job_replay_batch_size=2, _env_file=None))
    published = []

    async def publish(row):
        published.append(row["id"])

    publisher.publish = publish
    asyncio.run(publisher.replay())
    assert len(published) == 5
    assert len(set(published)) == 5


def test_create_document_and_job_share_one_transaction() -> None:
    class Client:
        def __init__(self):
            self.queries = []
            self.row = None

        async def query(self, query, variables=None):
            self.queries.append((query, variables))
            if query.startswith("SELECT * FROM job:"):
                return [self.row] if self.row else []
            if query.startswith("BEGIN TRANSACTION"):
                self.row = {
                    "id": JOB_ID, "document_id": "document:doc_" + "a" * 32,
                    "type": "ocr_pdf", "status": "queued",
                }
            return []

    client = Client()
    database = SurrealDatabase(Settings(_env_file=None))
    database._client = client

    async def run():
        first = await database.create_document_with_job("doc_" + "a" * 32, {"status": "active"}, "job_" + "a" * 32)
        second = await database.create_document_with_job("doc_" + "a" * 32, {"status": "active"}, "job_" + "a" * 32)
        return first, second

    first, second = asyncio.run(run())
    assert first == second
    transactions = [query for query, _ in client.queries if query.startswith("BEGIN TRANSACTION")]
    assert len(transactions) == 1
    assert "CREATE document:" in transactions[0]
    assert "CREATE job:" in transactions[0]
