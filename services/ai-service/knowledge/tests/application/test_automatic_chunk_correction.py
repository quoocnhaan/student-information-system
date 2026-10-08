"""Automatic indexed-chunk correction worker regressions."""

import asyncio
from unittest.mock import AsyncMock

import pytest

from app.config import Settings
from app.worker.correct import CorrectChunksHandler


def test_automatic_chunk_correction_applies_valid_results(monkeypatch: pytest.MonkeyPatch) -> None:
    database = AsyncMock()
    claimed = {"payload": {"chunk_id": "chunk:chunk_" + "a" * 32, "base_text": "Original", "embedding_text": "Original", "embedding_version": 1, "embedding_status": "ok", "hierarchy": {}}}
    database.apply_chunk_correction.return_value = [{"id": "job:job_child"}]

    async def corrected(*_args):
        return "Corrected"

    monkeypatch.setattr("app.worker.correct.correct_text", corrected)
    handler = CorrectChunksHandler(Settings(_env_file=None), database)
    result = asyncio.run(handler.process("job:job_parent", "a" * 32, claimed))

    assert result == [{"id": "job:job_child"}]
    database.apply_chunk_correction.assert_awaited_once_with(
        "job:job_parent", "a" * 32, "Corrected",
    )


def test_automatic_chunk_correction_rejects_unusable_model_output(monkeypatch: pytest.MonkeyPatch) -> None:
    database = AsyncMock()
    claimed = {"payload": {"chunk_id": "chunk:chunk_" + "a" * 32, "base_text": "Original", "embedding_text": "Original", "embedding_version": 1, "embedding_status": "ok", "hierarchy": {}}}

    async def unusable(*_args):
        return None

    monkeypatch.setattr("app.worker.correct.correct_text", unusable)
    handler = CorrectChunksHandler(Settings(_env_file=None), database)

    with pytest.raises(ValueError, match="unusable"):
        asyncio.run(handler.process("job:job_parent", "a" * 32, claimed))
    database.apply_chunk_correction.assert_not_awaited()
