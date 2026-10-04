"""Automatic correction of one captured indexed chunk."""

from collections.abc import Mapping

from app.application.correction import correct_text
from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase


class CorrectChunksHandler:
    type = "correct_chunks"
    version = 1

    def __init__(self, settings: Settings, database: SurrealDatabase) -> None:
        self.settings = settings
        self.database = database

    async def process(self, job_id: str, claim_id: str, claimed: dict) -> list[Mapping]:
        inputs = await self.database.correction_inputs(job_id)
        if len(inputs) != 1:
            raise ValueError("Correction job must contain exactly one input")
        captured = inputs[0]
        corrected = await correct_text(str(captured["base_text"]), self.settings)
        if corrected is None:
            raise ValueError("Correction model returned unusable text")
        results = {str(captured["id"]): corrected}
        await self.database.job_progress(job_id, claim_id, {
            "step": "correcting", "progress": 90,
        })
        followups = await self.database.apply_chunk_corrections(job_id, claim_id, results)
        if followups is None:
            raise RuntimeError("Correction claim is no longer active or chunk input changed")
        return followups

    async def on_failure(self, job_id: str, claim_id: str, claimed: dict, error: str) -> None:
        await self.database.fail_claim(job_id, claim_id, error)
