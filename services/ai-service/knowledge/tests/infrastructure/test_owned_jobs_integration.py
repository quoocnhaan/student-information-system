"""Optional real-SurrealDB checks for the atomic job path."""

import asyncio
import os
from uuid import uuid4

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
        try:
            suffix = uuid4().hex
            document_record_id = f"doc_{suffix}"
            job_record_id = f"job_{suffix}"
            job_id = f"job:{job_record_id}"
            document = {
                "source": {"object_key": f"documents/{document_record_id}/original.pdf",
                           "original_filename": "test.pdf", "mime_type": "application/pdf"},
                "process_status": "processing", "status": "active", "llm_correction": "skipped",
            }
            row = await database.create_document_with_job(document_record_id, document, job_record_id)
            assert str(row["id"]) == job_id
            assert (await database.create_document_with_job(document_record_id, document, job_record_id))["id"] == row["id"]
            claim_id = uuid4().hex
            assert await database.claim_job(job_id, claim_id, "ocr_pdf")
            assert await database.claim_job(job_id, uuid4().hex, "ocr_pdf") is None
            assert await database.job_progress(job_id, claim_id, {
                "step": "ocr", "progress": 30, "processed_pages": 1, "total_pages": 1,
            })
            assert await database.job_progress(job_id, claim_id, {
                "step": "ocr", "progress": 20, "processed_pages": 0,
            }) is None
            draft_id = f"ocr_job_{suffix}"
            result = await database.apply_ocr_result(
                document_record_id, draft_id, [{"page": 1, "raw_text": "Hello"}],
                {"title": "Hello"}, job_id, claim_id,
            )
            assert result == f"ocr_draft:{draft_id}"
            assert await database.apply_ocr_result(
                document_record_id, draft_id, [{"page": 1, "raw_text": "Changed"}],
                {"title": "Changed"}, job_id, claim_id,
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
        try:
            suffix = uuid4().hex
            document_id = f"doc_{suffix}"
            ocr_job_id = f"job:job_{suffix}"
            await database.create_document_with_job(document_id, {
                "source": {"object_key": f"documents/{document_id}/original.pdf",
                           "original_filename": "test.pdf", "mime_type": "application/pdf"},
                "process_status": "processing", "status": "active", "llm_correction": "skipped",
            }, f"job_{suffix}")
            ocr_claim = uuid4().hex
            assert await database.claim_job(ocr_job_id, ocr_claim, "ocr_pdf")
            await database.apply_ocr_result(document_id, f"ocr_job_{suffix}", [
                {"page": 1, "raw_text": "Điều 1. Nội dung\nOriginal text"},
            ], {"title": "Test"}, ocr_job_id, ocr_claim)
            assert await database.confirm_review(document_id, 2) is None
            index_job = await database.confirm_review(document_id, 1)
            assert index_job and index_job["status"] == "queued"
            assert (await database.confirm_review(document_id, 1))["id"] == index_job["id"]
            assert not await database.update_document_review(document_id, 1, {"title": "Changed"}, [])
            index_id = str(index_job["id"])
            index_claim = uuid4().hex
            assert await database.claim_job(index_id, index_claim, "index_document")
            draft = (await database.get_document_result(document_id))[1]
            chunks = chunk_pages(draft["pages"])
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
            correction = await database.request_chunk_correction(document_id, [chunk_id])
            assert correction
            assert await database.request_chunk_correction(document_id, [chunk_id]) is None
            correction_id = str(correction["id"])
            correction_claim = uuid4().hex
            assert await database.claim_job(correction_id, correction_claim, "correct_chunks")
            suggestion = (await database.job_suggestions(correction_id))[0]
            assert rows[-1]["text"] == suggestion["base_text"]
            await database.save_suggestion(str(suggestion["id"]), "Corrected text")
            await database.finish_chunk_correction(correction_id, correction_claim)
            outcome, reembed = await database.accept_suggestion(str(suggestion["id"]))
            assert outcome == "accepted" and reembed
            assert (await database.indexed_chunks(document_id))[-1]["embedding_status"] == "stale"
            reembed_id = str(reembed["id"])
            reembed_claim = uuid4().hex
            assert await database.claim_job(reembed_id, reembed_claim, "reembed_chunk")
            updated = (await database.indexed_chunks(document_id))[-1]
            assert updated["embedding_text"] == "Điều 1. Nội dung\n\nCorrected text"
            assert updated["token_count"] == 2
            await database.complete_reembed_job(reembed_id, reembed_claim, updated["embedding_text"], [0.002] * 768)
            assert (await database.indexed_chunks(document_id))[-1]["embedding_status"] == "ok"
            second = await database.request_chunk_correction(document_id, [chunk_id])
            assert second
            second_claim = uuid4().hex
            assert await database.claim_job(str(second["id"]), second_claim, "correct_chunks")
            second_suggestion = (await database.job_suggestions(str(second["id"])))[0]
            await database.save_suggestion(str(second_suggestion["id"]), "Another correction")
            await database.finish_chunk_correction(str(second["id"]), second_claim)
            assert await database.reject_suggestion(str(second_suggestion["id"]))
            assert (await database.indexed_chunks(document_id))[-1]["text"] == "Corrected text"
            third = await database.request_chunk_correction(document_id, [chunk_id])
            assert third
            third_claim = uuid4().hex
            assert await database.claim_job(str(third["id"]), third_claim, "correct_chunks")
            third_suggestion = (await database.job_suggestions(str(third["id"])))[0]
            await database.save_suggestion(str(third_suggestion["id"]), "Latest text")
            await database.finish_chunk_correction(str(third["id"]), third_claim)
            _, failed_reembed = await database.accept_suggestion(str(third_suggestion["id"]))
            assert failed_reembed
            failed_claim = uuid4().hex
            assert await database.claim_job(str(failed_reembed["id"]), failed_claim, "reembed_chunk")
            await database.fail_reembed_job(str(failed_reembed["id"]), failed_claim, "embedding unavailable")
            assert (await database.get_job(str(failed_reembed["id"])))["status"] == "failed"
            assert (await database.get_document(document_id))["process_status"] == "indexed"
            assert (await database.indexed_chunks(document_id))[-1]["embedding_status"] == "stale"
            fourth = await database.request_chunk_correction(document_id, [chunk_id])
            assert fourth
            fourth_claim = uuid4().hex
            assert await database.claim_job(str(fourth["id"]), fourth_claim, "correct_chunks")
            fourth_suggestion = (await database.job_suggestions(str(fourth["id"])))[0]
            await database.save_suggestion(str(fourth_suggestion["id"]), "Obsolete suggestion")
            await database.finish_chunk_correction(str(fourth["id"]), fourth_claim)
            await database.client.query(f"UPDATE {chunk_id} SET text = 'Newer text';")
            outcome, no_job = await database.accept_suggestion(str(fourth_suggestion["id"]))
            assert outcome == "outdated" and no_job is None
            assert (await database.indexed_chunks(document_id))[-1]["suggestion"]["status"] == "outdated"
        finally:
            await database.close()

    asyncio.run(run())


@pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No test SurrealDB configured")
def test_ocr_enqueues_correction_and_correction_opens_review() -> None:
    settings = Settings(
        SURREAL_URL=os.environ["KNOWLEDGE_TEST_SURREAL_URL"],
        SURREAL_USER="root", SURREAL_PASSWORD="root",
        SURREAL_NAMESPACE="check", SURREAL_DATABASE="knowledge",
        _env_file=None,
    )

    async def run() -> None:
        database = SurrealDatabase(settings)
        await database.connect()
        try:
            suffix = uuid4().hex
            document_id = f"doc_{suffix}"
            job_id = f"job:job_{suffix}"
            document = {
                "source": {"object_key": f"documents/{document_id}/original.pdf",
                           "original_filename": "test.pdf", "mime_type": "application/pdf"},
                "process_status": "processing", "status": "active", "llm_correction": "enabled",
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
            assert finished["next_job_id"] is not None
            correction_id = str(finished["next_job_id"])
            assert (await database.get_job(correction_id))["status"] == "queued"
            assert (await database.get_document(document_id))["process_status"] == "processing"
            assert (await database.get_document_result(document_id))[1]["correction_status"] == "pending"
            correction_claim = uuid4().hex
            assert await database.claim_job(correction_id, correction_claim, "correct_ocr")
            corrected = await database.complete_correction_job(
                correction_id, correction_claim, draft_id,
                [{"page": 1, "raw_text": "Original text", "corrected_text": "Corrected text"}],
                {"title": "Corrected text"}, "chat-model", "v1",
            )
            assert corrected["status"] == "completed"
            assert (await database.get_document(document_id))["process_status"] == "review"
            assert (await database.get_document_result(document_id))[1]["pages"][0]["corrected_text"] == "Corrected text"
        finally:
            await database.close()

    asyncio.run(run())
