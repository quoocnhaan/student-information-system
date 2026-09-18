"""PDF rendering and OCR through LM Studio's OpenAI-compatible API."""

import base64
from io import BytesIO
from collections.abc import Awaitable, Callable
from typing import Any

from anyio import to_thread
import httpx
import pypdfium2 as pdfium

from app.config import Settings
from app.domain.document import OcrPage


class OcrError(RuntimeError):
    """Raised when a PDF cannot be rendered or OCR cannot be completed."""


class LmStudioOcr:
    """Read one PDF page at a time with the configured LM Studio OCR model."""

    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.lmstudio_base_url.rstrip("/")
        self._model = settings.lmstudio_ocr_model
        self._max_pages = settings.ocr_max_pages
        self._max_output_tokens = settings.ocr_max_output_tokens
        self._timeout_seconds = settings.ocr_timeout_seconds

    async def extract_pdf(
        self,
        pdf_data: bytes,
        on_page_count: Callable[[int], Awaitable[None]] | None = None,
        on_page_processed: Callable[[int, int], Awaitable[None]] | None = None,
    ) -> list[OcrPage]:
        """Render every allowed PDF page and return its OCR text in reading order."""

        page_count = await to_thread.run_sync(lambda: _get_page_count(pdf_data))
        if page_count == 0:
            raise OcrError("PDF contains no pages")
        if page_count > self._max_pages:
            raise OcrError(
                f"PDF has {page_count} pages; the limit is {self._max_pages} pages"
            )
        if on_page_count is not None:
            await on_page_count(page_count)

        pages: list[OcrPage] = []
        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            for page_index in range(page_count):
                image_bytes = await to_thread.run_sync(
                    lambda page_index=page_index: _render_page_as_png(pdf_data, page_index)
                )
                raw_text = await self._extract_page(client, image_bytes)
                pages.append(OcrPage(page=page_index + 1, raw_text=raw_text))
                if on_page_processed is not None:
                    await on_page_processed(page_index + 1, page_count)
        return pages

    async def _extract_page(self, client: httpx.AsyncClient, image_bytes: bytes) -> str:
        image_data = base64.b64encode(image_bytes).decode("ascii")
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_data}"
                            },
                        },
                    ],
                }
            ],
            "temperature": 0,
            "max_tokens": self._max_output_tokens,
        }
        try:
            response = await client.post(
                f"{self._base_url}/chat/completions", json=payload
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise OcrError("LM Studio OCR request failed") from error

        if not isinstance(content, str) or not content.strip():
            raise OcrError("LM Studio OCR returned no text")
        return content.strip()


def _get_page_count(pdf_data: bytes) -> int:
    try:
        document = pdfium.PdfDocument(pdf_data)
        return len(document)
    except Exception as error:
        raise OcrError("PDF could not be rendered") from error


def _render_page_as_png(pdf_data: bytes, page_index: int) -> bytes:
    """Render to the model-card target longest edge while preserving aspect ratio."""

    try:
        document = pdfium.PdfDocument(pdf_data)
        page = document[page_index]
        width, height = page.get_size()
        scale = min(200 / 72, 1540 / max(width, height))
        bitmap = page.render(scale=scale)
        image = bitmap.to_pil()
        output = BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()
    except Exception as error:
        raise OcrError(f"PDF page {page_index + 1} could not be rendered") from error
