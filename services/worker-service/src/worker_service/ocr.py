"""Independent PDF rendering and LM Studio OCR processor."""

import asyncio
import base64
from io import BytesIO

import httpx
import pypdfium2 as pdfium
from anyio import to_thread

from worker_service.clients import JobClient, KnowledgeClient, PermanentError, retry_temporary
from worker_service.config import Settings


def _page_count(data: bytes) -> int:
    try:
        return len(pdfium.PdfDocument(data))
    except Exception as error:
        raise PermanentError("PDF could not be rendered") from error


def _render(data: bytes, index: int) -> bytes:
    try:
        document = pdfium.PdfDocument(data)
        page = document[index]
        width, height = page.get_size()
        scale = min(200 / 72, 1540 / max(width, height))
        image = page.render(scale=scale).to_pil()
        output = BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()
    except Exception as error:
        raise PermanentError(f"PDF page {index + 1} could not be rendered") from error


class KnowledgeOcrHandler:
    owner = "knowledge"
    type = "ocr_pdf"
    version = 1

    def __init__(self, settings: Settings, knowledge: KnowledgeClient, jobs: JobClient) -> None:
        self.settings = settings
        self.knowledge = knowledge
        self.jobs = jobs

    async def process(self, job_id: str, claim_id: str, claimed: dict) -> str:
        data = await retry_temporary(lambda: self.knowledge.source(job_id, claim_id))
        count = await to_thread.run_sync(lambda: _page_count(data))
        if count < 1 or count > self.settings.ocr_max_pages:
            raise PermanentError(f"PDF page count is outside 1..{self.settings.ocr_max_pages}")
        await retry_temporary(lambda: self.jobs.progress(
            job_id, claim_id, step="ocr", progress=10, total_pages=count, processed_pages=0
        ))
        pages: list[dict] = []
        async with httpx.AsyncClient(timeout=self.settings.ocr_timeout_seconds) as client:
            for index in range(count):
                image = await to_thread.run_sync(lambda index=index: _render(data, index))
                text = await self._extract_page(client, image)
                pages.append({"page": index + 1, "raw_text": text})
                progress = 10 + round(((index + 1) / count) * 75)
                await retry_temporary(lambda index=index, progress=progress: self.jobs.progress(
                    job_id, claim_id, step="ocr", progress=progress,
                    total_pages=count, processed_pages=index + 1,
                ))
        await retry_temporary(lambda: self.jobs.progress(
            job_id, claim_id, step="saving_draft", progress=92,
            total_pages=count, processed_pages=count,
        ))
        return await retry_temporary(lambda: self.knowledge.result(job_id, claim_id, pages))

    async def fail_domain(self, job_id: str, claim_id: str) -> None:
        await retry_temporary(lambda: self.knowledge.fail(job_id, claim_id))

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
                response = await client.post(self.settings.lmstudio_base_url.rstrip("/") + "/chat/completions", json=payload)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
            if not isinstance(content, str) or not content.strip():
                raise ValueError("LM Studio returned no OCR text")
            return content.strip()
        except (TimeoutError, httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise PermanentError("LM Studio OCR request failed") from error
