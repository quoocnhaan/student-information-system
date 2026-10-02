"""PDF rendering and OCR through the service's own stores."""

import asyncio
import base64
from io import BytesIO

import httpx
import pypdfium2 as pdfium
from anyio import to_thread

from app.application.document_metadata import DocumentMetadataDetector
from app.config import Settings
from app.domain.document import OcrPage
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.surreal import SurrealDatabase


def _page_count(data: bytes) -> int:
    try:
        return len(pdfium.PdfDocument(data))
    except Exception as error:
        raise ValueError("PDF could not be rendered") from error


def _render(data: bytes, index: int) -> bytes:
    try:
        document = pdfium.PdfDocument(data)
        page = document[index]
        width, height = page.get_size()
        scale = min(200 / 72, 1540 / max(width, height))
        output = BytesIO()
        page.render(scale=scale).to_pil().save(output, format="PNG")
        return output.getvalue()
    except Exception as error:
        raise ValueError(f"PDF page {index + 1} could not be rendered") from error


class OcrPdfHandler:
    type = "ocr_pdf"
    version = 1

    def __init__(self, settings: Settings, database: SurrealDatabase, objects: MinioObjectStore) -> None:
        self.settings = settings
        self.database = database
        self.objects = objects

    async def process(self, job_id: str, claim_id: str, claimed: dict):
        document_id = str(claimed["document_id"])
        record_id = document_id.split(":", 1)[1]
        document = await self.database.get_document(record_id)
        if document is None:
            raise ValueError("Source document not found")
        object_key = document["source"]["object_key"]
        size = await self.objects.get_size(object_key)
        if size > self.settings.max_upload_bytes:
            raise ValueError("Source exceeds upload limit")
        data = await self.objects.get_bytes(object_key)
        if len(data) > self.settings.max_upload_bytes:
            raise ValueError("Source exceeds upload limit")
        count = await to_thread.run_sync(lambda: _page_count(data))
        if count < 1 or count > self.settings.ocr_max_pages:
            raise ValueError(f"PDF page count is outside 1..{self.settings.ocr_max_pages}")
        await self.database.job_progress(job_id, claim_id, {
            "step": "ocr", "progress": 10, "total_pages": count, "processed_pages": 0,
        })
        pages: list[OcrPage] = []
        async with httpx.AsyncClient(timeout=self.settings.ocr_timeout_seconds) as client:
            for index in range(count):
                image = await to_thread.run_sync(lambda index=index: _render(data, index))
                text = await self._extract_page(client, image)
                pages.append(OcrPage(page=index + 1, raw_text=text))
                await self.database.job_progress(job_id, claim_id, {
                    "step": "ocr", "progress": 10 + round(((index + 1) / count) * 75),
                    "total_pages": count, "processed_pages": index + 1,
                })
        await self.database.job_progress(job_id, claim_id, {
            "step": "saving_draft", "progress": 92, "total_pages": count,
            "processed_pages": count,
        })
        metadata = (
            DocumentMetadataDetector().detect(pages, document["source"]["original_filename"])
            if document.get("llm_correction") == "skipped" else {}
        )
        draft_id = f"ocr_{job_id.split(':', 1)[1]}"
        await self.database.apply_ocr_result(
            record_id, draft_id, [page.model_dump() for page in pages], metadata,
            job_id, claim_id,
        )
        completed = await self.database.get_job(job_id)
        return await self.database.get_job(str(completed["next_job_id"])) if completed and completed.get("next_job_id") else None

    async def _extract_page(self, client: httpx.AsyncClient, image: bytes) -> str:
        payload = {
            "model": self.settings.lmstudio_ocr_model,
            "messages": [{"role": "user", "content": [{"type": "image_url", "image_url": {
                "url": "data:image/png;base64," + base64.b64encode(image).decode("ascii")
            }}]}],
            "temperature": 0, "max_tokens": self.settings.ocr_max_output_tokens,
        }
        try:
            async with asyncio.timeout(self.settings.ocr_timeout_seconds):
                response = await client.post(
                    self.settings.lmstudio_base_url.rstrip("/") + "/chat/completions", json=payload
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
            if not isinstance(content, str) or not content.strip():
                raise ValueError("LM Studio returned no OCR text")
            return content.strip()
        except (TimeoutError, httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise RuntimeError("LM Studio OCR request failed") from error
