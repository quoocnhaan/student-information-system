"""Automatic correction of one captured indexed chunk."""

from collections.abc import Mapping

from app.application.correction import correct_text
from app.config import Settings
from app.domain.job import validate_payload
from app.infrastructure.surreal import SurrealDatabase


class CorrectChunksHandler:
    type = "correct_chunks"
    version = 1

    def __init__(self, settings: Settings, database: SurrealDatabase) -> None:
        self.settings = settings
        self.database = database

    async def process(self, job_id: str, attempt_id: str, claimed: dict) -> list[Mapping]:
        captured = validate_payload(self.type, claimed["payload"])
        corrected = await correct_text(captured.base_text, self.settings)
        if corrected is None:
            raise ValueError("Correction model returned unusable text")
        await self.database.job_progress(job_id, attempt_id, {
            "step": "correcting", "progress": 90,
        })
        followups = await self.database.apply_chunk_correction(job_id, attempt_id, corrected)
        if followups is None:
            raise RuntimeError("Correction claim is no longer active or chunk input changed")
        return followups

    async def on_failure(self, job_id: str, attempt_id: str, claimed: dict, error: str) -> None:
        await self.database.fail_claim(job_id, attempt_id, error)
