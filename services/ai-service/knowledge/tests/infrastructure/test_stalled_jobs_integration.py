"""Real transaction and claim fencing regressions on an isolated database."""

import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

import pytest

from app.application.chunking import chunk_pages
from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError
from app.jobs.routes import Envelope
from app.worker.core import execute
from app.worker.index import IndexDocumentHandler

pytestmark = pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No isolated SurrealDB configured")


@asynccontextmanager
async def isolated():
    name = "stalled_" + uuid4().hex
    settings = Settings(
        SURREAL_URL=os.environ["KNOWLEDGE_TEST_SURREAL_URL"],
        SURREAL_USER="root", SURREAL_PASSWORD="root", SURREAL_NAMESPACE="check",
        SURREAL_DATABASE=name, worker_id="index-1", index_commit_timeout_seconds=5,
        failure_timeout_seconds=2, index_processing_timeout_seconds=2, _env_file=None,
    )
    database = SurrealDatabase(settings)
    await database.connect()
    try:
        await database.execute_script((Path(__file__).parents[2] / "db/schema.surql").read_text(encoding="utf-8"))
        yield database, settings
    finally:
        cleanup = SurrealDatabase(settings)
        await cleanup.connect()
        try:
            await cleanup.client.query(f"REMOVE DATABASE {name};")
        finally:
            await cleanup.close()
            await database.close()


async def index_job(database):
    suffix = uuid4().hex
    document_id, job_id = "doc_" + suffix, "job:job_" + suffix
    await database.create_document_with_job(document_id, {
        "source": {"object_key": suffix + ".pdf", "original_filename": "test.pdf", "mime_type": "application/pdf"},
        "status": "active", "process_status": "processing",
    }, "job_" + suffix)
    claim = uuid4().hex
    await database.claim_job(job_id, claim, "ocr_pdf")
    await database.apply_ocr_result(document_id, "ocr_job_" + suffix,
        [{"page": 1, "raw_text": "Confirmed document text"}], {}, job_id, claim)
    job = await database.confirm_review(document_id, 1, {}, [], [1])
    chunks = chunk_pages((await database.get_index_input_for_job(str(job["id"]))) ["pages"])
    for chunk in chunks:
        chunk["embedding"] = [0.001] * 768
    return str(job["id"]), document_id, chunks


@pytest.mark.parametrize("repair", ["migration"])
def test_historical_migration_removed_chunk_draft_link(monkeypatch, repair):
    async def run():
        async with isolated() as (database, settings):
            job_id, document_id, chunks = await index_job(database)
            # Older deployments required a draft link that the current index
            # transaction no longer supplies (and deletes on completion).
            await database.execute_script(
                "DEFINE FIELD ocr_draft_id ON TABLE chunk TYPE record<ocr_draft>;"
            )
            job = await database.get_job(job_id)
            draft = (await database.get_document_result(document_id))[1]
            old_chunk_id = "chunk:chunk_" + uuid4().hex
            await database.client.query(f"CREATE {old_chunk_id} CONTENT $chunk;", {
                "chunk": {**chunks[0], "document_id": job["document_id"], "ocr_draft_id": draft["id"]},
            })
            before = (await database.client.query(f"SELECT * FROM {old_chunk_id};"))[0]
            for _ in range(2):
                if repair == "schema":
                    await database.execute_script(
                        (Path(__file__).parents[2] / "db/schema.surql").read_text(encoding="utf-8")
                    )
                else:
                    await database.execute_script((Path(__file__).parents[2] / "db/migrations/010_confirmed_index_input.surql").read_text(encoding="utf-8"))
            preserved = (await database.client.query(f"SELECT * FROM {old_chunk_id};"))[0]
            assert preserved["text"] == before["text"] and preserved["embedding"] == before["embedding"]
            info = await database.client.query("INFO FOR TABLE chunk;")
            assert "ocr_draft_id" not in info["fields"]
            claim = uuid4().hex
            await database.claim_job(job_id, claim, "index_document")
            completed = await database.complete_index_job(job_id, claim, chunks, "test")
            assert completed["status"] == "completed"
            assert len(await database.client.query("SELECT * FROM chunk;")) == len(chunks)

    asyncio.run(run())


class Message:
    acked = False
    nacked = False

    async def ack(self):
        self.acked = True

    async def nack(self, *, requeue):
        self.nacked = requeue


@pytest.mark.parametrize("lost_response", [False, True])
def test_hanging_commit_reconciles_failure_or_durable_success(monkeypatch, lost_response):
    from app.worker import index

    async def run():
        async with isolated() as (database, settings):
            settings.index_commit_timeout_seconds = 0.2
            job_id, document_id, chunks = await index_job(database)
            sdk = database.client.sdk
            original = sdk.query_raw

            async def unanswered(query, variables=None):
                if "DELETE chunk WHERE" in query:
                    if lost_response:
                        await original(query, variables)
                    await asyncio.sleep(10)
                return await original(query, variables)

            sdk.query_raw = unanswered
            model_calls = []

            async def embed(texts, settings):
                model_calls.append(texts)
                return [[0.001] * 768 for _ in texts]

            monkeypatch.setattr(index, "embed_texts", embed)
            message = Message()
            result = await asyncio.wait_for(execute(Envelope(1, "index_document", job_id),
                IndexDocumentHandler(settings, database), database, message, settings), 3)
            assert result is None  # failure/uncertain paths never publish
            assert message.acked and not message.nacked and len(model_calls) == 1
            fresh = SurrealDatabase(settings)
            await fresh.connect()
            try:
                job = await fresh.get_job(job_id)
                assert job["status"] == ("completed" if lost_response else "failed")
                assert (await fresh.get_document(document_id))["process_status"] == ("indexed" if lost_response else "failed")
                assert bool(await fresh.get_index_input_for_job(job_id)) != lost_response
                rows = await fresh.client.query("SELECT * FROM chunk;")
                assert len(rows) == (len(chunks) if lost_response else 0)
            finally:
                await fresh.close()

    asyncio.run(run())


def test_checked_error_retry_and_old_completion_are_fenced():
    async def run():
        async with isolated() as (database, settings):
            job_id, document_id, chunks = await index_job(database)
            claim = uuid4().hex
            assert await database.claim_job(job_id, claim, "index_document")
            with pytest.raises(SurrealDatabaseError):
                await database.client.query("BEGIN TRANSACTION; SELECT * FROM job; THROW 'later_statement'; COMMIT TRANSACTION;")
            invalid = [dict(chunk, embedding=[0.1]) for chunk in chunks]
            with pytest.raises(SurrealDatabaseError):
                await database.complete_index_job(job_id, claim, invalid, "test")
            assert (await database.get_job(job_id))["status"] == "running"
            assert not await database.client.query("SELECT * FROM chunk;")
            assert await database.requeue_failed_index_job(job_id) is None
            await database.fail_claim(job_id, claim, "commit failed")
            retried = await database.requeue_failed_index_job(job_id)
            assert retried["status"] == "queued" and not retried.get("worker_id") and not retried.get("attempt_id")
            current_claim = uuid4().hex
            assert await database.claim_job(job_id, current_claim, "index_document")
            assert await database.complete_index_job(job_id, claim, chunks, "test") is None
            await database.fail_claim(job_id, claim, "obsolete failure")
            assert (await database.get_document(document_id))["process_status"] == "indexing"
            # Valid 768-dimensional transaction completes and clears retained inputs.
            result = await database.complete_index_job(job_id, current_claim, chunks, "test")
            assert result["status"] == "completed"
            await database.reconcile_failure(job_id, current_claim, "lost response")
            assert (await database.get_job(job_id))["status"] == "completed"
            assert await database.requeue_failed_index_job(job_id) is None

    asyncio.run(run())


def test_startup_recovers_only_previous_runs_of_same_identity():
    async def run():
        async with isolated() as (database, settings):
            owned, _, _ = await index_job(database)
            database.worker_run_id = "old-run"
            await database.claim_job(owned, uuid4().hex, "index_document")
            other, _, _ = await index_job(database)
            await database.claim_job(other, uuid4().hex, "index_document")
            await database.client.query(f"UPDATE {other} SET worker_id = 'other-replica';")
            current, _, _ = await index_job(database)
            database.worker_run_id = "new-run"
            await database.claim_job(current, uuid4().hex, "index_document")
            legacy, _, _ = await index_job(database)
            await database.claim_job(legacy, uuid4().hex, "index_document")
            await database.client.query(f"UPDATE {legacy} SET worker_id = NONE, worker_run_id = NONE;")
            queued, _, _ = await index_job(database)
            await database.recover_abandoned_jobs("new-run")
            await database.recover_abandoned_jobs("new-run")
            assert (await database.get_job(owned))["status"] == "failed"
            assert await database.get_index_input_for_job(owned)
            for job_id in (other, current, legacy):
                assert (await database.get_job(job_id))["status"] == "running"
            assert (await database.get_job(queued))["status"] == "queued"

    asyncio.run(run())


@pytest.mark.parametrize("job_type", ["ocr_pdf", "correct_chunks", "reembed_chunk"])
def test_failure_domain_effects_preserve_source_review_and_vectors(job_type):
    async def run():
        async with isolated() as (database, settings):
            if job_type == "ocr_pdf":
                suffix = uuid4().hex
                document_id, job_id = "doc_" + suffix, "job:job_" + suffix
                await database.create_document_with_job(document_id, {
                    "source": {"object_key": suffix + ".pdf", "original_filename": "test.pdf", "mime_type": "application/pdf"},
                    "status": "active", "process_status": "processing",
                }, "job_" + suffix)
                claim = uuid4().hex
                await database.claim_job(job_id, claim, "ocr_pdf")
            else:
                index_id, document_id, chunks = await index_job(database)
                index_claim = uuid4().hex
                await database.claim_job(index_id, index_claim, "index_document")
                await database.complete_index_job(index_id, index_claim, chunks, "test")
                chunk = (await database.indexed_chunks(document_id))[0]
                chunk_id = str(chunk["id"])
                correction = await database.request_chunk_correction(document_id, chunk_id)
                job_id, claim = str(correction["id"]), uuid4().hex
                await database.claim_job(job_id, claim, "correct_chunks")
                suggestion = (await database.get_job(job_id))["payload"]
                if job_type == "reembed_chunk":
                    children = await database.apply_chunk_correction(job_id, claim, "Reviewed corrected text")
                    reembed = children[0]
                    job_id, claim = str(reembed["id"]), uuid4().hex
                    await database.claim_job(job_id, claim, "reembed_chunk")
            # Wrong claim cannot mutate any domain record.
            await database.fail_claim(job_id, uuid4().hex, "obsolete")
            assert (await database.get_job(job_id))["status"] == "running"
            await database.reconcile_failure(job_id, claim, "deadline exceeded")
            assert (await database.get_job(job_id))["status"] == "failed"
            document = await database.get_document(document_id)
            assert document["source"]["object_key"]
            if job_type == "ocr_pdf":
                assert document["process_status"] == "failed"
            else:
                assert document["process_status"] == "indexed"
                preserved = (await database.indexed_chunks(document_id))[0]
                assert preserved["embedding"] == [0.001] * 768
                if job_type == "correct_chunks":
                    assert (await database.get_job(job_id))["result"]["outcome"] == "failed"

    asyncio.run(run())


def test_in_flight_old_transaction_cannot_overwrite_retry_and_missing_input_is_rejected():
    async def run():
        async with isolated() as (database, settings):
            job_id, document_id, chunks = await index_job(database)
            claim = uuid4().hex
            await database.claim_job(job_id, claim, "index_document")
            original = database.client.sdk.query_raw
            replacement_claim = uuid4().hex

            async def race(query, variables=None):
                if "DELETE chunk WHERE" in query:
                    fresh = SurrealDatabase(settings)
                    await fresh.connect()
                    try:
                        await fresh.fail_claim(job_id, claim, "timed out")
                        await fresh.requeue_failed_index_job(job_id)
                        await fresh.claim_job(job_id, replacement_claim, "index_document")
                    finally:
                        await fresh.close()
                return await original(query, variables)

            database.client.sdk.query_raw = race
            with pytest.raises(SurrealDatabaseError):
                await database.complete_index_job(job_id, claim, chunks, "test")
            database.client.sdk.query_raw = original
            assert (await database.get_job(job_id))["attempt_id"] == replacement_claim
            assert (await database.get_document(document_id))["process_status"] == "indexing"
            assert not await database.client.query("SELECT * FROM chunk;")
            await database.fail_claim(job_id, replacement_claim, "failed again")
            job = await database.get_job(job_id)
            await database.client.query(f"DELETE {job['payload']['index_input_id']};")
            assert await database.requeue_failed_index_job(job_id) is None
            assert (await database.get_job(job_id))["status"] == "failed"

    asyncio.run(run())


def test_concurrent_completion_and_failure_preserve_one_atomic_terminal_outcome():
    async def run():
        async with isolated() as (database, settings):
            job_id, document_id, chunks = await index_job(database)
            claim = uuid4().hex
            await database.claim_job(job_id, claim, "index_document")
            competitor = SurrealDatabase(settings)
            await competitor.connect()
            try:
                await asyncio.gather(
                    database.complete_index_job(job_id, claim, chunks, "test"),
                    competitor.fail_claim(job_id, claim, "deadline expired"),
                    return_exceptions=True,
                )
                current = await database.get_job(job_id)
                document = await database.get_document(document_id)
                assert current["status"] in ("completed", "failed")
                completed = current["status"] == "completed"
                assert document["process_status"] == ("indexed" if completed else "failed")
                rows = await database.client.query("SELECT * FROM chunk;")
                assert len(rows) == (len(chunks) if completed else 0)
                assert bool(await database.get_index_input_for_job(job_id)) != completed
            finally:
                await competitor.close()

    asyncio.run(run())
