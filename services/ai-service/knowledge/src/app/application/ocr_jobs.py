"""Durable OCR job processing."""

from typing import Any, Mapping
from uuid import uuid4

from app.application.document_metadata import DocumentMetadataDetector
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.ocr import LmStudioOcr
from app.infrastructure.surreal import SurrealDatabase


class PermanentJobError(RuntimeError):
    """An error caused by source data that retrying cannot correct."""


class OcrJobProcessor:
    """Execute one persisted OCR job and report every UI-visible milestone."""

    def __init__(
        self,
        database: SurrealDatabase,
        object_store: MinioObjectStore,
        ocr_service: LmStudioOcr,
    ) -> None:
        self._database = database
        self._object_store = object_store
        self._ocr_service = ocr_service
        self._metadata_detector = DocumentMetadataDetector()

    async def process(self, job: Mapping[str, Any]) -> None:
        """Process one claimed job and let the worker own retry/failure policy."""

        job_id = _record_id(job["id"])
        document_id = _record_id(job["document_id"])
        document = await self._database.get_document(document_id)
        if document is None:
            raise PermanentJobError("source document no longer exists")
        object_key = document["source"]["object_key"]
        pdf_data = await self._object_store.get_bytes(object_key)

        await self._database.update_job(job_id, {"step": "ocr", "progress": 10})

        async def set_page_count(page_count: int) -> None:
            await self._database.update_job(
                job_id,
                {"total_pages": page_count, "processed_pages": 0, "progress": 10},
            )

        async def set_page_progress(processed: int, total: int) -> None:
            progress = 10 + round((processed / total) * 75)
            await self._database.update_job(
                job_id,
                {
                    "step": "ocr",
                    "progress": progress,
                    "total_pages": total,
                    "processed_pages": processed,
                },
            )

        pages = await self._ocr_service.extract_pdf(
            pdf_data,
            on_page_count=set_page_count,
            on_page_processed=set_page_progress,
        )
        await self._database.update_job(
            job_id, {"step": "detecting_metadata", "progress": 87}
        )
        metadata = self._metadata_detector.detect(
            pages, document["source"]["original_filename"]
        )
        await self._database.update_job(
            job_id, {"step": "saving_draft", "progress": 92}
        )
        ocr_draft_id = f"ocr_{uuid4().hex}"
        await self._database.create_ocr_draft(
            ocr_draft_id,
            document_id,
            [page.model_dump() for page in pages],
        )
        await self._database.update_document_after_ocr(
            document_id, len(pages), metadata
        )
        await self._database.complete_job(job_id, ocr_draft_id, len(pages))


def _record_id(value: Any) -> str:
    if hasattr(value, "id"):
        return str(value.id)
    return str(value).split(":", maxsplit=1)[-1]
