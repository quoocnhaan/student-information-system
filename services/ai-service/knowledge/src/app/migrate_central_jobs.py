"""Copy Knowledge jobs from the former central database without deleting originals.

Set OLD_JOB_SURREAL_URL/USER/PASSWORD/NAMESPACE/DATABASE and the normal
Knowledge SURREAL_* settings. Stop central workers and API before running.
"""

import asyncio
import os
from typing import Any

from surrealdb import AsyncSurreal

from app.config import get_settings
from app.infrastructure.surreal import SurrealDatabase, _record_id


async def old_connection() -> Any:
    names = (
        "OLD_JOB_SURREAL_URL", "OLD_JOB_SURREAL_USER", "OLD_JOB_SURREAL_PASSWORD",
        "OLD_JOB_SURREAL_NAMESPACE", "OLD_JOB_SURREAL_DATABASE",
    )
    if not all(os.environ.get(name) for name in names):
        raise ValueError("All OLD_JOB_SURREAL_* connection settings are required")
    client = AsyncSurreal(os.environ["OLD_JOB_SURREAL_URL"])
    await client.connect()
    await client.signin({
        "username": os.environ["OLD_JOB_SURREAL_USER"],
        "password": os.environ["OLD_JOB_SURREAL_PASSWORD"],
    })
    await client.use(
        os.environ["OLD_JOB_SURREAL_NAMESPACE"], os.environ["OLD_JOB_SURREAL_DATABASE"]
    )
    return client


def mapped_fields(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "ocr_pdf", "dedupe_key": "ocr_pdf",
        "document_id": str(row["subject_id"]),
        "status": row["status"], "step": row["step"],
        "progress": row["progress"], "total_pages": row.get("total_pages"),
        "processed_pages": row.get("processed_pages", 0),
        "sequence": row.get("sequence", 1),
        "claim_id": row.get("claim_id"),
        "ocr_draft_id": str(row["result_ref"]) if row.get("result_ref") else None,
        "error": row.get("error"),
    }


def verify_row(source: dict[str, Any], target: dict[str, Any]) -> None:
    expected = mapped_fields(source)
    actual = {
        **target,
        "document_id": str(target.get("document_id")),
        "ocr_draft_id": str(target["ocr_draft_id"]) if target.get("ocr_draft_id") else None,
    }
    if str(source["id"]) != str(target["id"]) or any(actual.get(key) != value for key, value in expected.items()):
        raise RuntimeError(f"Migration mismatch for {source['id']}")


async def migrate(old: Any, knowledge: SurrealDatabase) -> tuple[int, int, list[str]]:
    copied = verified = 0
    running: list[str] = []
    cursor: str | None = None
    while True:
        after = f"AND id > job:{cursor} " if cursor else ""
        rows = await old.query(
            f"SELECT * FROM job WHERE owner = 'knowledge' {after}ORDER BY id LIMIT 100;"
        )
        if not rows:
            break
        for source in rows:
            record_id = _record_id(source["id"])
            cursor = record_id
            target = await knowledge.get_job(str(source["id"]))
            if target is None:
                expected = mapped_fields(source)
                document_record_id = _record_id(expected.pop("document_id"))
                draft_id = expected.pop("ocr_draft_id")
                draft_expression = (
                    f"ocr_draft:{_record_id(draft_id)}" if draft_id else "NONE"
                )
                await knowledge.client.query(
                    f"CREATE job:{record_id} CONTENT {{"
                    "type: $job.type, dedupe_key: $job.dedupe_key, "
                    f"document_id: document:{document_record_id}, "
                    "status: $job.status, step: $job.step, progress: $job.progress, "
                    "total_pages: $job.total_pages, processed_pages: $job.processed_pages, "
                    "sequence: $job.sequence, claim_id: $job.claim_id, "
                    f"ocr_draft_id: {draft_expression}, error: $job.error" 
                    "};",
                    {"job": expected},
                )
                target = await knowledge.get_job(str(source["id"]))
                copied += 1
            if target is None:
                raise RuntimeError(f"Migration lost {source['id']}")
            verify_row(source, target)
            verified += 1
            if source["status"] == "running":
                running.append(str(source["id"]))
        if len(rows) < 100:
            break
    return copied, verified, running


async def run() -> tuple[int, int, list[str]]:
    old = await old_connection()
    knowledge = SurrealDatabase(get_settings())
    await knowledge.connect()
    try:
        await knowledge.apply_schema()
        return await migrate(old, knowledge)
    finally:
        await knowledge.close()
        await old.close()


if __name__ == "__main__":
    created, checked, running_jobs = asyncio.run(run())
    print(f"Copied {created} Knowledge jobs; verified {checked} rows")
    for job_id in running_jobs:
        print(f"Still running: {job_id}")
