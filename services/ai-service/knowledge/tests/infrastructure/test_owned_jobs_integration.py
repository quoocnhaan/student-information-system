"""Optional real-SurrealDB checks for the atomic job path."""

import asyncio
import os
from uuid import uuid4
from pathlib import Path

import pytest

from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase
from app.application.chunking import chunk_pages


@pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No test SurrealDB configured")
def test_atomic_ocr_job_lifecycle() -> None:
    settings = Settings(
        SURREAL_URL=os.environ["KNOWLEDGE_TEST_SURREAL_URL"],
        SURREAL_USER="root", SURREAL_PASSWORD="root",
        SURREAL_NAMESPACE="check", SURREAL_DATABASE="knowledge",
        _env_file=None,
    )

    async def run() -> None:
        database = SurrealDatabase(settings)
        await database.connect()
        await database.execute_script((Path(__file__).parents[2] / "db/schema.surql").read_text(encoding="utf-8"))
        try:
            suffix = uuid4().hex
            document_record_id = f"doc_{suffix}"
            job_record_id = f"job_{suffix}"
            job_id = f"job:{job_record_id}"
            document = {
                "source": {"object_key": f"documents/{document_record_id}/original.pdf",
                           "original_filename": "test.pdf", "mime_type": "application/pdf"},
                "process_status": "processing", "status": "active",
            }
            row = await database.create_document_with_job(document_record_id, document, job_record_id)
            assert str(row["id"]) == job_id
            assert (await database.create_document_with_job(document_record_id, document, job_record_id))["id"] == row["id"]
            attempt_id = uuid4().hex
            assert await database.claim_job(job_id, attempt_id, "ocr_pdf")
            assert await database.claim_job(job_id, uuid4().hex, "ocr_pdf") is None
            assert await database.job_progress(job_id, attempt_id, {
                "step": "ocr", "progress": 30,
            })
            assert await database.job_progress(job_id, attempt_id, {
                "step": "ocr", "progress": 20,
            }) is None
            draft_id = f"ocr_job_{suffix}"
            result = await database.apply_ocr_result(
                document_record_id, draft_id, [{"page": 1, "raw_text": "Hello"}],
                {"title": "Hello"}, job_id, attempt_id,
            )
            assert result == f"ocr_draft:{draft_id}"
            assert await database.apply_ocr_result(
                document_record_id, draft_id, [{"page": 1, "raw_text": "Changed"}],
                {"title": "Changed"}, job_id, attempt_id,
            ) == result
            assert (await database.get_job(job_id))["status"] == "completed"
            assert (await database.get_document(document_record_id))["process_status"] == "review"
            failed_suffix = uuid4().hex
            failed_document_id = f"doc_{failed_suffix}"
            failed_job_id = f"job:job_{failed_suffix}"
            await database.create_document_with_job(
                failed_document_id,
                {**document, "source": {**document["source"], "object_key": f"documents/{failed_document_id}/original.pdf"}},
                f"job_{failed_suffix}",
            )
            failed_claim = uuid4().hex
            assert await database.claim_job(failed_job_id, failed_claim, "ocr_pdf")
            failed_row = await database.fail_job(failed_job_id, failed_claim, "OCR failed")
            assert failed_row["status"] == "failed"
            assert (await database.fail_job(failed_job_id, failed_claim, "OCR failed"))["status"] == "failed"
            assert (await database.get_document(failed_document_id))["process_status"] == "failed"
        finally:
            await database.close()

    asyncio.run(run())


@pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No test SurrealDB configured")
def test_confirm_index_and_post_index_correction() -> None:
    settings = Settings(
        SURREAL_URL=os.environ["KNOWLEDGE_TEST_SURREAL_URL"],
        SURREAL_USER="root", SURREAL_PASSWORD="root",
        SURREAL_NAMESPACE="check", SURREAL_DATABASE="knowledge", _env_file=None,
    )

    async def run() -> None:
        database = SurrealDatabase(settings)
        await database.connect()
        await database.execute_script((Path(__file__).parents[2] / "db/schema.surql").read_text(encoding="utf-8"))
        try:
            suffix = uuid4().hex
            document_id = f"doc_{suffix}"
            ocr_job_id = f"job:job_{suffix}"
            await database.create_document_with_job(document_id, {
                "source": {"object_key": f"documents/{document_id}/original.pdf",
                           "original_filename": "test.pdf", "mime_type": "application/pdf"},
                "process_status": "processing", "status": "active",
            }, f"job_{suffix}")
            ocr_claim = uuid4().hex
            assert await database.claim_job(ocr_job_id, ocr_claim, "ocr_pdf")
            await database.apply_ocr_result(document_id, f"ocr_job_{suffix}", [
                {"page": 1, "raw_text": "Điều 1. Nội dung\nOriginal text"},
            ], {"title": "Test"}, ocr_job_id, ocr_claim)
            assert await database.confirm_review(document_id, 2, {}, [], [1]) is None
            index_job = await database.confirm_review(document_id, 1, {}, [], [1])
            assert index_job and index_job["status"] == "queued"
            assert (await database.confirm_review(document_id, 1, {}, [], [1]))["id"] == index_job["id"]
            assert await database.confirm_review(document_id, 1, {"title": "Changed"}, [], [1]) is None
            index_id = str(index_job["id"])
            index_claim = uuid4().hex
            assert await database.claim_job(index_id, index_claim, "index_document")
            confirmed = await database.get_index_input_for_job(index_id)
            chunks = chunk_pages(confirmed["pages"])
            for chunk in chunks:
                chunk["embedding"] = [0.001] * 768
            assert (await database.complete_index_job(index_id, index_claim, chunks, "test-model"))["status"] == "completed"
            rows = await database.indexed_chunks(document_id)
            assert rows and len(rows) == len(chunks)
            assert all(len(row["embedding"]) == 768 for row in rows)
            assert rows[-1]["hierarchy"]["article_heading"] == "Điều 1. Nội dung"
            nearest = await database.client.query(
                "SELECT id FROM chunk WHERE embedding <|5,COSINE|> $vector;",
                {"vector": [0.001] * 768},
            )
            assert nearest
            chunk_id = str(rows[-1]["id"])
            correction = await database.request_chunk_correction(document_id, chunk_id)
            assert correction
            assert await database.request_chunk_correction(document_id, chunk_id) is None
            correction_id = str(correction["id"])
            correction_claim = uuid4().hex
            assert await database.claim_job(correction_id, correction_claim, "correct_chunks")
            suggestion = (await database.get_job(correction_id))["payload"]
            assert rows[-1]["text"] == suggestion["base_text"]
            children = await database.apply_chunk_correction(correction_id, correction_claim, "Corrected text")
            assert children and len(children) == 1
            reembed = children[0]
            assert (await database.indexed_chunks(document_id))[-1]["embedding_status"] == "stale"
            reembed_id = str(reembed["id"])
            reembed_claim = uuid4().hex
            assert await database.claim_job(reembed_id, reembed_claim, "reembed_chunk")
            updated = (await database.indexed_chunks(document_id))[-1]
            assert updated["embedding_text"] == "Điều 1. Nội dung\n\nCorrected text"
            assert updated["token_count"] == 2
            await database.complete_reembed_job(reembed_id, reembed_claim, updated["embedding_text"], [0.002] * 768)
            assert (await database.indexed_chunks(document_id))[-1]["embedding_status"] == "ok"
            second = await database.request_chunk_correction(document_id, chunk_id)
            assert second
            second_claim = uuid4().hex
            assert await database.claim_job(str(second["id"]), second_claim, "correct_chunks")
            second_suggestion = (await database.get_job(str(second["id"])))["payload"]
            assert await database.apply_chunk_correction(str(second["id"]), second_claim,
                "Corrected text") == []
            assert (await database.indexed_chunks(document_id))[-1]["correction"]["outcome"] == "unchanged"
        finally:
            await database.close()

    asyncio.run(run())


@pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No test SurrealDB configured")
def test_ocr_opens_raw_review_without_followup() -> None:
    settings = Settings(
        SURREAL_URL=os.environ["KNOWLEDGE_TEST_SURREAL_URL"],
        SURREAL_USER="root", SURREAL_PASSWORD="root",
        SURREAL_NAMESPACE="check", SURREAL_DATABASE="knowledge",
        _env_file=None,
    )

    async def run() -> None:
        database = SurrealDatabase(settings)
        await database.connect()
        await database.execute_script((Path(__file__).parents[2] / "db/schema.surql").read_text(encoding="utf-8"))
        try:
            suffix = uuid4().hex
            document_id = f"doc_{suffix}"
            job_id = f"job:job_{suffix}"
            document = {
                "source": {"object_key": f"documents/{document_id}/original.pdf",
                           "original_filename": "test.pdf", "mime_type": "application/pdf"},
                "process_status": "processing", "status": "active",
            }
            await database.create_document_with_job(document_id, document, f"job_{suffix}")
            claim = uuid4().hex
            assert await database.claim_job(job_id, claim, "ocr_pdf")
            draft_id = f"ocr_draft:ocr_job_{suffix}"
            await database.apply_ocr_result(
                document_id, f"ocr_job_{suffix}", [{"page": 1, "raw_text": "Original text"}],
                {}, job_id, claim,
            )
            finished = await database.get_job(job_id)
            assert finished["status"] == "completed"
            assert finished["followup_job_ids"] == []
            assert finished["payload"] == {}
            assert (await database.get_document(document_id))["process_status"] == "review"
            draft = (await database.get_document_result(document_id))[1]
            assert draft["pages"] == [{"page": 1, "raw_text": "Original text"}]
            assert "correction_status" not in draft
        finally:
            await database.close()

    asyncio.run(run())
