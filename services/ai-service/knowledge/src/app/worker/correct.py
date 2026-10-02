"""Automatic correction of OCR draft pages before human review."""

from collections.abc import Mapping

from app.application.correction import CORRECTION_PROMPT_VERSION, correct_text
from app.application.document_metadata import DocumentMetadataDetector
from app.config import Settings
from app.domain.document import OcrPage
from app.infrastructure.surreal import SurrealDatabase


class CorrectOcrHandler:
    type = "correct_ocr"
    version = 1

    def __init__(self, settings: Settings, database: SurrealDatabase) -> None:
        self.settings = settings
        self.database = database

    async def _load(self, claimed: Mapping) -> tuple[Mapping, Mapping]:
        record_id = str(claimed["document_id"]).split(":", 1)[1]
        result = await self.database.get_document_result(record_id)
        if result is None or result[1] is None:
            raise ValueError("OCR draft is missing")
        return result[0], result[1]

    def _metadata(self, pages: list[Mapping], filename: str) -> dict:
        inputs = [
            OcrPage(page=int(page["page"]), raw_text=str(page.get("corrected_text") or page["raw_text"]))
            for page in pages
        ]
        return DocumentMetadataDetector().detect(inputs, filename)

    async def process(self, job_id: str, claim_id: str, claimed: dict) -> None:
        document, draft = await self._load(claimed)
        pages = [dict(page) for page in draft["pages"]]
        total = len(pages)
        for index, page in enumerate(pages):
            page["corrected_text"] = await correct_text(str(page["raw_text"]), self.settings)
            await self.database.job_progress(job_id, claim_id, {
                "step": "correcting", "progress": 10 + round((index + 1) / total * 80),
                "processed_pages": index + 1, "total_pages": total,
            })
        metadata = self._metadata(pages, document["source"]["original_filename"])
        saved = await self.database.complete_correction_job(
            job_id, claim_id, str(draft["id"]), pages, metadata,
            self.settings.lmstudio_chat_model, CORRECTION_PROMPT_VERSION,
        )
        if saved is None:
            raise RuntimeError("Correction claim is no longer active")

    async def on_failure(self, job_id: str, claim_id: str, claimed: dict, error: str) -> None:
        document, draft = await self._load(claimed)
        pages = [dict(page) for page in draft["pages"]]
        metadata = DocumentMetadataDetector().detect(
            [OcrPage(page=int(page["page"]), raw_text=str(page["raw_text"])) for page in pages],
            document["source"]["original_filename"],
        )
        await self.database.fail_correction_job(job_id, claim_id, str(draft["id"]), metadata, error)


class CorrectChunksHandler:
    type = "correct_chunks"
    version = 1

    def __init__(self, settings: Settings, database: SurrealDatabase) -> None:
        self.settings = settings
        self.database = database

    async def process(self, job_id: str, claim_id: str, claimed: dict) -> None:
        suggestions = await self.database.job_suggestions(job_id)
        if not suggestions:
            raise ValueError("Correction job contains no suggestions")
        for index, suggestion in enumerate(suggestions):
            corrected = await correct_text(str(suggestion["base_text"]), self.settings)
            value = corrected if corrected and corrected != suggestion["base_text"] else None
            await self.database.save_suggestion(str(suggestion["id"]), value)
            await self.database.job_progress(job_id, claim_id, {
                "step": "correcting", "progress": 10 + round((index + 1) / len(suggestions) * 80),
            })
        await self.database.finish_chunk_correction(job_id, claim_id)

    async def on_failure(self, job_id: str, claim_id: str, claimed: dict, error: str) -> None:
        await self.database.finish_chunk_correction(job_id, claim_id, error)
