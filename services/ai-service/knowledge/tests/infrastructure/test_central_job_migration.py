"""The central-to-Knowledge migration preserves public job identity."""

import asyncio

from app.migrate_central_jobs import mapped_fields, migrate

JOB_ID = "job:job_" + "a" * 32
DOCUMENT_ID = "document:doc_" + "a" * 32


def test_migration_preserves_job_fields_and_is_idempotent() -> None:
    source = {
        "id": JOB_ID, "owner": "knowledge", "subject_id": DOCUMENT_ID,
        "status": "running", "step": "ocr", "progress": 35,
        "total_pages": 4, "processed_pages": 1, "sequence": 8,
        "claim_id": "b" * 32, "result_ref": None, "error": None,
    }

    class Old:
        async def query(self, query):
            return [] if "AND id >" in query else [source]

    class Target:
        def __init__(self):
            self.rows = {}
            self.client = self

        async def get_job(self, job_id):
            return self.rows.get(job_id)

        async def query(self, query, variables):
            self.rows[JOB_ID] = {
                "id": JOB_ID, **mapped_fields(source),
            }

    target = Target()

    async def run():
        first = await migrate(Old(), target)
        second = await migrate(Old(), target)
        return first, second

    first, second = asyncio.run(run())
    assert first == (1, 1, [JOB_ID])
    assert second == (0, 1, [JOB_ID])
    assert target.rows[JOB_ID]["sequence"] == 8
    assert target.rows[JOB_ID]["status"] == "running"
