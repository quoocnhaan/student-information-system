"""Fresh-schema automatic correction and embedding concurrency regressions."""

import asyncio
import os
from uuid import uuid4

import pytest

from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError
from app.jobs.routes import Envelope
from app.worker.core import execute
from app.worker.correct import CorrectChunksHandler
from app.domain.job import validate_payload
from surrealdb import RecordID
from test_stalled_jobs_integration import Message, index_job, isolated

pytestmark = pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No isolated database")


def test_payload_roundtrips_are_typed_private_and_immutable_through_retry():
    async def run():
        async with isolated() as (database, _):
            index_id, document_id, chunks = await index_job(database)
            ocr = (await database.client.query("SELECT * FROM job WHERE type = 'ocr_pdf';"))[0]
            assert ocr["payload"] == {} and not ocr.get("next_job_id")
            job = await database.get_job(index_id)
            payload = dict(job["payload"])
            assert isinstance(payload["index_input_id"], RecordID)
            assert validate_payload(job["type"], payload).confirmation_fingerprint
            claim = uuid4().hex
            await database.claim_job(index_id, claim, "index_document")
            await database.job_progress(index_id, claim, {"step": "embedding", "progress": 40})
            await database.fail_claim(index_id, claim, "test failure")
            failed = await database.get_job(index_id)
            assert failed["progress"] == 40 and failed["payload"] == payload
            retried = await database.requeue_failed_index_job(index_id)
            assert retried["progress"] == 0 and retried["payload"] == payload
            with pytest.raises(SurrealDatabaseError, match="readonly"):
                await database.client.query(f"UPDATE {index_id} SET payload.confirmation_fingerprint = $fingerprint;", {"fingerprint": "f" * 64})
            assert (await database.get_job(index_id))["payload"] == payload
            new_claim = uuid4().hex
            await database.claim_job(index_id, new_claim, "index_document")
            assert await database.job_progress(index_id, claim, {"progress": 50}) is None
            with pytest.raises(ValueError):
                await database.job_progress(index_id, new_claim, {"progress": 100})
            with pytest.raises(ValueError):
                await database.job_progress(index_id, new_claim, {"processed_pages": 1})
            assert await database.complete_index_job(index_id, new_claim, chunks, "mock")
            chunk = (await database.indexed_chunks(document_id))[0]
            parent = await database.request_chunk_correction(document_id, str(chunk["id"]))
            assert isinstance(parent["payload"]["chunk_id"], RecordID)
            assert isinstance(parent["payload"]["correction_input_id"], RecordID)
            assert validate_payload(parent["type"], parent["payload"])
            correction_claim = uuid4().hex
            await database.claim_job(str(parent["id"]), correction_claim, "correct_chunks")
            captured = (await database.correction_inputs(str(parent["id"])))[0]
            assert str(captured["id"]) == str(parent["payload"]["correction_input_id"])
            children = await database.apply_chunk_corrections(str(parent["id"]), correction_claim, {str(captured["id"]): "Corrected text"})
            assert len(children) == 1
            child = children[0]
            assert isinstance(child["payload"]["chunk_id"], RecordID)
            assert validate_payload(child["type"], child["payload"]).embedding_version == 2
            child_claim = uuid4().hex
            await database.claim_job(str(child["id"]), child_claim, "reembed_chunk")
            completed = await database.complete_reembed_job(str(child["id"]), child_claim, child["payload"]["embedding_text"], [0.002] * 768)
            assert completed["payload"] == child["payload"]
            for row in (ocr, failed, retried, parent, completed):
                assert not {"index_input_id", "confirmation_fingerprint", "chunk_id", "embedding_text", "embedding_version", "total_pages", "processed_pages"}.intersection(row)
    asyncio.run(run())


async def indexed(database, count=1):
    job_id, document_id, chunks = await index_job(database)
    claim = uuid4().hex
    await database.claim_job(job_id, claim, "index_document")
    chunks = [dict(chunks[0], position={**chunks[0]["position"], "chunk_index": i}) for i in range(count)]
    await database.complete_index_job(job_id, claim, chunks, "mock")
    return document_id, await database.indexed_chunks(document_id)


async def requested(database, document_id, chunks):
    job = await database.request_chunk_correction(document_id, str(chunks[0]["id"]))
    assert job
    claim = uuid4().hex
    assert await database.claim_job(str(job["id"]), claim, "correct_chunks")
    return str(job["id"]), claim, await database.correction_inputs(str(job["id"]))


@pytest.mark.parametrize("changed,stale", [(True, False), (False, False), (False, True)])
def test_atomic_application_fanout_and_duplicate_completion(changed, stale):
    async def run():
        async with isolated() as (database, _):
            document_id, chunks = await indexed(database, 2)
            if stale:
                await database.client.query(f"UPDATE {chunks[0]['id']} SET embedding_status = 'stale';")
            job_id, claim, inputs = await requested(database, document_id, chunks)
            assert await database.request_chunk_correction(document_id, str(chunks[0]["id"])) is None
            results = {str(row["id"]): row["base_text"] + (" corrected" if changed else "") for row in inputs}
            children = await database.apply_chunk_corrections(job_id, claim, results)
            assert len(children) == (1 if changed or stale else 0)
            queued = await database.queued_jobs_after(None, 100)
            assert {str(child["id"]) for child in children}.issubset({str(row["id"]) for row in queued})
            assert [row["id"] for row in await database.apply_chunk_corrections(job_id, claim, results)] == [row["id"] for row in children]
            assert await database.claim_job(job_id, uuid4().hex, "correct_chunks") is None
            assert {row["status"] for row in await database.correction_inputs(job_id)} == {"applied" if changed else "unchanged"}
            for child in children:
                child_id, child_claim = str(child["id"]), uuid4().hex
                await database.claim_job(child_id, child_claim, "reembed_chunk")
                assert await database.complete_reembed_job(child_id, child_claim, child["payload"]["embedding_text"], [0.002] * 768)
            assert all(row["embedding_status"] == "ok" for row in await database.indexed_chunks(document_id))
    asyncio.run(run())


def test_fresh_database_contains_only_current_contracts():
    async def run():
        async with isolated() as (database, _):
            info = await database.client.query("INFO FOR DB;")
            assert "chunk_correction_input" in info["tables"] and "correction_suggestion" not in info["tables"]
            fields = (await database.client.query("INFO FOR TABLE job;"))["fields"]
            assert "ocr_draft_id" not in fields and "correction_mode" not in fields
            assert {"next_job_id", "followup_job_ids", "payload", "claim_id", "worker_id"}.issubset(fields)
            draft_fields = (await database.client.query("INFO FOR TABLE ocr_draft;"))["fields"]
            assert "pages.*.reviewed_text" not in draft_fields
    asyncio.run(run())


def test_concurrent_requests_take_only_one_durable_lock():
    async def run():
        async with isolated() as (database, settings):
            document_id, chunks = await indexed(database)
            competitor = SurrealDatabase(settings)
            await competitor.connect()
            try:
                results = await asyncio.gather(*(
                    connection.request_chunk_correction(document_id, str(chunks[0]["id"]))
                    for connection in (database, competitor)
                ), return_exceptions=True)
                assert len([value for value in results if isinstance(value, dict)]) == 1
                assert len(await database.client.query("SELECT * FROM job WHERE type = 'correct_chunks';")) == 1
                assert len(await database.client.query("SELECT * FROM chunk_correction_input;")) == 1
            finally:
                await competitor.close()
    asyncio.run(run())


@pytest.mark.parametrize("mutation", ["text", "embedding_text", "embedding_version", "hierarchy", "delete", "input", "claim"])
def test_changed_or_deleted_inputs_abort_entire_request(mutation):
    async def run():
        async with isolated() as (database, _):
            document_id, chunks = await indexed(database, 2)
            job_id, claim, inputs = await requested(database, document_id, chunks)
            target = str(chunks[0]["id"])
            if mutation == "delete":
                await database.client.query(f"DELETE {target};")
            elif mutation == "input":
                await database.client.query(f"DELETE {inputs[0]['id']};")
            elif mutation == "claim":
                await database.client.query(f"UPDATE {job_id} SET claim_id = 'replacement';")
            elif mutation == "hierarchy":
                await database.client.query(f"UPDATE {target} SET hierarchy.article_heading = 'Changed heading';")
            else:
                value = 999 if mutation == "embedding_version" else "changed input"
                await database.client.query(f"UPDATE {target} SET {mutation} = $value;", {"value": value})
            results = {str(row["id"]): "Corrected" for row in inputs}
            if mutation == "input":
                with pytest.raises(ValueError):
                    await database.apply_chunk_corrections(job_id, claim, results)
            else:
                assert await database.apply_chunk_corrections(job_id, claim, results) is None
            await database.fail_claim(job_id, claim, "Input changed")
            current = (await database.client.query(f"SELECT * FROM {chunks[1]['id']};"))[0]
            assert current["text"] == chunks[1]["text"] and current["embedding"] == chunks[1]["embedding"]
            assert not await database.client.query("SELECT * FROM job WHERE type = 'reembed_chunk';")
            if mutation not in ("claim", "delete"):
                assert await database.request_chunk_correction(document_id, str(chunks[0]["id"]))
    asyncio.run(run())


@pytest.mark.parametrize("failure", ["unusable", "model", "deadline", "lost_reply"])
def test_worker_failure_and_lost_commit_reply(monkeypatch, failure):
    async def run():
        async with isolated() as (database, settings):
            document_id, chunks = await indexed(database, 2)
            job = await database.request_chunk_correction(document_id, str(chunks[0]["id"]))
            job_id = str(job["id"])
            settings.correction_processing_timeout_seconds = 0.15
            async def model(text, _):
                if failure == "unusable":
                    return None
                if failure == "model":
                    raise RuntimeError("Model unavailable")
                if failure == "deadline":
                    await asyncio.sleep(10)
                return text + " corrected"
            monkeypatch.setattr("app.worker.correct.correct_text", model)
            original = database.client.sdk.query_raw
            async def query(sql, variables=None):
                result = await original(sql, variables)
                if failure == "lost_reply" and "LET $parent" in sql:
                    raise TimeoutError("Committed reply lost")
                return result
            database.client.sdk.query_raw = query
            children = await execute(Envelope(1, "correct_chunks", job_id), CorrectChunksHandler(settings, database), database, Message(), settings)
            fresh = SurrealDatabase(settings)
            await fresh.connect()
            try:
                parent = await fresh.get_job(job_id)
                if failure == "lost_reply":
                    assert parent["status"] == "completed" and len(children) == 1
                    assert [str(row["id"]) for row in children] == [str(value) for value in parent["followup_job_ids"]]
                else:
                    assert parent["status"] == "failed" and children is None
                    assert not parent["followup_job_ids"]
                    after = await fresh.indexed_chunks(document_id)
                    assert [row["text"] for row in after] == [row["text"] for row in chunks]
                    assert after[0]["correction"]["job"]["status"] == "failed"
                    assert after[1]["correction"] is None
                    assert all(row["embedding"] == [0.001] * 768 for row in after)
            finally:
                await fresh.close()
    asyncio.run(run())


@pytest.mark.parametrize("superseded", [False, True])
def test_child_failure_preserves_vector_and_allows_explicit_correction(superseded):
    async def run():
        async with isolated() as (database, _):
            document_id, chunks = await indexed(database)
            job_id, claim, inputs = await requested(database, document_id, chunks)
            child = (await database.apply_chunk_corrections(job_id, claim, {str(inputs[0]["id"]): "Corrected"}))[0]
            child_id, child_claim = str(child["id"]), uuid4().hex
            await database.claim_job(child_id, child_claim, "reembed_chunk")
            if superseded:
                await database.client.query(f"UPDATE {chunks[0]['id']} SET embedding_version += 1;")
                assert await database.complete_reembed_job(child_id, child_claim, child["payload"]["embedding_text"], [0.002] * 768) is None
            await database.fail_claim(child_id, child_claim, "Embedding failed")
            row = (await database.indexed_chunks(document_id))[0]
            assert row["text"] == "Corrected" and row["embedding"] == [0.001] * 768
            assert row["embedding_status"] == "stale" and row["correction"]["children"][0]["status"] == "failed"
            assert await database.request_chunk_correction(document_id, str(row["id"]))
    asyncio.run(run())
