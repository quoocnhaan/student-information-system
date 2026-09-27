"""Copy legacy Knowledge jobs into the central store without deleting source rows.

Run only after stopping the old Knowledge worker. Restart job-service afterwards
to replay imported queued jobs, then verify public reads before the drop migration.
"""

import asyncio
import os
from typing import Any

from surrealdb import AsyncSurreal

from job_service.config import get_settings
from job_service.store import JobStore, record_id


async def _old_connection() -> Any:
    required = ("OLD_SURREAL_URL", "OLD_SURREAL_USER", "OLD_SURREAL_PASSWORD", "OLD_SURREAL_NAMESPACE", "OLD_SURREAL_DATABASE")
    if not all(os.environ.get(key) for key in required):
        raise ValueError("All OLD_SURREAL_* connection settings are required")
    client = AsyncSurreal(os.environ["OLD_SURREAL_URL"])
    await client.connect()
    await client.signin({"username": os.environ["OLD_SURREAL_USER"], "password": os.environ["OLD_SURREAL_PASSWORD"]})
    await client.use(os.environ["OLD_SURREAL_NAMESPACE"], os.environ["OLD_SURREAL_DATABASE"])
    return client


async def run() -> tuple[int, int]:
    old = await _old_connection()
    central = JobStore(get_settings())
    await central.connect()
    await central.apply_schema()
    copied = 0
    verified = 0
    cursor: str | None = None
    try:
        while True:
            after = f"AND id > job:{cursor} " if cursor else ""
            rows = await old.query(f"SELECT * FROM job WHERE true {after}ORDER BY id LIMIT 100;")
            if not rows:
                break
            for row in rows:
                rid = record_id(row["id"])
                cursor = rid
                existing = await central.get(str(row["id"]))
                subject_id = str(row["document_id"])
                expected = {
                    "owner": "knowledge", "type": "ocr_pdf", "subject_id": subject_id,
                    "creation_key": subject_id, "status": row["status"],
                    "step": row["step"], "progress": row["progress"],
                    "total_pages": row.get("total_pages"),
                    "processed_pages": row.get("processed_pages", 0),
                    "sequence": row.get("sequence", 1),
                    "claim_id": row.get("worker_id"),
                    "result_ref": str(row["ocr_draft_id"]) if row.get("ocr_draft_id") else None,
                    "error": row.get("error"),
                }
                if existing is None:
                    await central.client.query(f"CREATE job:{rid} CONTENT $job;", {"job": expected})
                    copied += 1
                    existing = await central.get(str(row["id"]))
                if existing is None or any(existing.get(key) != value for key, value in expected.items()):
                    raise RuntimeError(f"Migration mismatch for {row['id']}")
                verified += 1
            if len(rows) < 100:
                break
        return copied, verified
    finally:
        await central.close()
        await old.close()


if __name__ == "__main__":
    count, checked = asyncio.run(run())
    print(f"Copied {count} Knowledge jobs; verified {checked} central rows")
