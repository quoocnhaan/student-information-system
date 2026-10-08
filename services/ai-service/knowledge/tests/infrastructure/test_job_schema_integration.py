"""Fresh job schema, atomic claiming, and optimistic progress ordering."""

import asyncio
import os
from uuid import uuid4

import pytest

from app.infrastructure.surreal import SurrealDatabase
from test_stalled_jobs_integration import index_job, isolated

pytestmark = pytest.mark.skipif(
    not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No isolated database"
)


def test_fresh_job_schema_has_only_target_fields():
    async def run():
        async with isolated() as (database, _):
            info = await database.client.query("INFO FOR TABLE job;")
            assert {field for field in info["fields"] if "." not in field} == {
                "document_id", "type", "dedupe_key", "payload", "status", "step",
                "progress", "version", "attempt_id", "worker_id", "worker_run_id",
                "followup_job_ids", "error", "created_at", "updated_at", "result",
            }
            assert "followup_job_ids.*" in info["fields"]
            assert "job_document_dedupe" in info["indexes"]
            job_id, _, _ = await index_job(database)
            job = await database.get_job(job_id)
            assert job["version"] == 1 and job["followup_job_ids"] == []
            assert not job.get("attempt_id")

    asyncio.run(run())


def test_duplicate_claims_and_stale_progress_are_fenced(monkeypatch):
    async def run():
        async with isolated() as (database, settings):
            job_id, _, _ = await index_job(database)
            competitor = SurrealDatabase(settings)
            await competitor.connect()
            try:
                attempts = [uuid4().hex, uuid4().hex]
                claims = await asyncio.gather(
                    database.claim_job(job_id, attempts[0], "index_document"),
                    competitor.claim_job(job_id, attempts[1], "index_document"),
                )
                winners = [row for row in claims if row is not None]
                assert len(winners) == 1
                claimed = winners[0]
                assert claimed["version"] == 2
                attempt = claimed["attempt_id"]
                stale = await database.get_job(job_id)
                newer = await competitor.job_progress(job_id, attempt, {"progress": 40})
                assert newer["version"] == stale["version"] + 1
                original_get = database.get_job

                async def stale_read(_):
                    return stale

                # A delayed writer read version 2 before the newer commit.
                monkeypatch.setattr(database, "get_job", stale_read)
                assert await database.job_progress(job_id, attempt, {"progress": 60}) is None
                monkeypatch.setattr(database, "get_job", original_get)
                assert (await database.get_job(job_id))["progress"] == 40
                assert await database.job_progress(job_id, attempt, {"progress": 30}) is None
                final = await database.job_progress(job_id, attempt, {"progress": 60})
                assert final["version"] == newer["version"] + 1
            finally:
                await competitor.close()

    asyncio.run(run())
