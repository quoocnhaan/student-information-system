"""An OCR request is bounded by elapsed time, not socket inactivity."""

import asyncio

import pytest

from worker_service.clients import PermanentError
from worker_service.config import Settings
from worker_service.ocr import KnowledgeOcrHandler


class HangingClient:
    async def post(self, url, json):
        await asyncio.sleep(1)


def test_elapsed_ocr_deadline() -> None:
    settings = Settings(ocr_timeout_seconds=0.01)
    handler = KnowledgeOcrHandler(settings, None, None)
    with pytest.raises(PermanentError, match="LM Studio OCR request failed"):
        asyncio.run(handler._extract_page(HangingClient(), b"image"))
