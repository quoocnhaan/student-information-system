"""Sole database adapter for central job state."""

import asyncio
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from surrealdb import AsyncSurreal

from job_service.config import Settings

_JOB_ID = re.compile(r"job_[0-9a-f]{32}\Z")


def record_id(value: Any) -> str:
    return str(value).split(":", 1)[-1]


def snapshot(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]), "owner": row["owner"], "type": row["type"],
        "subject_id": row["subject_id"], "status": row["status"],
        "step": row["step"], "progress": row["progress"],
        "total_pages": row.get("total_pages"),
        "processed_pages": row.get("processed_pages", 0),
        "sequence": row.get("sequence", 1),
        "result_ref": row.get("result_ref"), "error": row.get("error"),
        "updated_at": str(row["updated_at"]) if row.get("updated_at") else None,
    }


class JobStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client: Any | None = None

    async def connect(self) -> None:
        client = AsyncSurreal(self.settings.surreal_url)
        try:
            await client.connect()
            await client.signin({"username": self.settings.surreal_user, "password": self.settings.surreal_password})
            await client.use(self.settings.surreal_namespace, self.settings.surreal_database)
        except Exception:
            await client.close()
            raise
        self.client = client

    async def close(self) -> None:
        if self.client is not None:
            await self.client.close()
            self.client = None

    async def apply_schema(self) -> None:
        script = (Path.cwd() / "db" / "schema.surql").read_text(encoding="utf-8")
        response = await self.client.query_raw(script)
        for statement in response.get("result", []):
            if statement.get("status") != "OK":
                raise RuntimeError(f"Job schema failed: {statement.get('result')}")

    async def ready(self) -> bool:
        try:
            await self.client.query("RETURN true;")
            return True
        except Exception:
            return False

    async def get(self, job_id: str) -> dict[str, Any] | None:
        rid = record_id(job_id)
        if not _JOB_ID.fullmatch(rid):
            return None
        rows = await self.client.query(f"SELECT * FROM job:{rid};")
        return rows[0] if rows else None

    async def find_creation(self, owner: str, creation_key: str) -> dict[str, Any] | None:
        rows = await self.client.query(
            "SELECT * FROM job WHERE owner = $owner AND creation_key = $key LIMIT 1;",
            {"owner": owner, "key": creation_key},
        )
        return rows[0] if rows else None

    async def create(self, owner: str, type_: str, subject_id: str, creation_key: str) -> dict[str, Any]:
        existing = await self.find_creation(owner, creation_key)
        if existing is not None:
            if existing["type"] != type_ or existing["subject_id"] != subject_id:
                raise ValueError("creation key already belongs to another job")
            return existing
        rid = f"job_{uuid4().hex}"
        try:
            rows = await self.client.query(
                f"CREATE job:{rid} CONTENT {{owner: $owner, type: $type, "
                "subject_id: $subject, creation_key: $key, status: 'queued', "
                "step: 'queued', progress: 0, processed_pages: 0, sequence: 1};",
                {"owner": owner, "type": type_, "subject": subject_id, "key": creation_key},
            )
            return rows[0]
        except Exception:
            # A concurrent request or an ambiguous commit may have inserted the
            # unique (owner, creation_key) pair.
            existing = await self.find_creation(owner, creation_key)
            if existing is None:
                raise
            if existing["type"] != type_ or existing["subject_id"] != subject_id:
                raise ValueError("creation key already belongs to another job")
            return existing

    async def claim(self, job_id: str, claim_id: str, owner: str, type_: str) -> dict[str, Any] | None:
        rid = record_id(job_id)
        if not _JOB_ID.fullmatch(rid):
            return None
        for attempt in range(5):
            try:
                rows = await self.client.query(
                    f"UPDATE job:{rid} SET status = 'running', step = 'claimed', "
                    "progress = 5, claim_id = $claim_id, sequence += 1 "
                    "WHERE status = 'queued' AND owner = $owner AND type = $type RETURN AFTER;",
                    {"claim_id": claim_id, "owner": owner, "type": type_},
                )
                if rows:
                    return rows[0]
                existing = await self.get(job_id)
                return existing if existing and existing.get("status") == "running" and existing.get("claim_id") == claim_id and existing.get("owner") == owner and existing.get("type") == type_ else None
            except Exception as error:
                if "Transaction conflict" not in str(error) or attempt == 4:
                    raise
                await asyncio.sleep(0.025 * 2**attempt)
        return None

    async def progress(self, job_id: str, claim_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        rid = record_id(job_id)
        if not _JOB_ID.fullmatch(rid):
            return None
        fields = {"step", "progress", "total_pages", "processed_pages"}
        if not changes or set(changes) - fields:
            raise ValueError("Invalid progress fields")
        existing = await self.get(job_id)
        if existing and existing.get("status") == "running" and existing.get("claim_id") == claim_id and all(existing.get(field) == value for field, value in changes.items()):
            return existing
        assignments = ", ".join(f"{field} = $changes.{field}" for field in changes)
        rows = await self.client.query(
            f"UPDATE job:{rid} SET {assignments}, sequence += 1 "
            "WHERE status = 'running' AND claim_id = $claim_id "
            "AND progress <= $changes.progress RETURN AFTER;",
            {"claim_id": claim_id, "changes": changes},
        )
        return rows[0] if rows else None

    async def finish(self, job_id: str, claim_id: str, *, result_ref: str | None = None, error: str | None = None) -> dict[str, Any] | None:
        rid = record_id(job_id)
        if not _JOB_ID.fullmatch(rid):
            return None
        target = "failed" if error is not None else "completed"
        existing = await self.get(job_id)
        if existing and existing.get("status") == target and existing.get("claim_id") == claim_id:
            if (existing.get("result_ref") or None) == result_ref and (existing.get("error") or None) == error:
                return existing
            return None
        rows = await self.client.query(
            f"UPDATE job:{rid} SET status = $status, step = $status, progress = 100, "
            "result_ref = $result_ref, error = $error, sequence += 1 "
            "WHERE status = 'running' AND claim_id = $claim_id RETURN AFTER;",
            {"status": target, "claim_id": claim_id, "result_ref": result_ref, "error": error},
        )
        if rows:
            return rows[0]
        # A response can be lost after the update commits.
        existing = await self.get(job_id)
        if existing and existing.get("status") == target and existing.get("claim_id") == claim_id:
            return existing
        return None

    async def queued_after(self, after: str | None, limit: int) -> list[dict[str, Any]]:
        if after is not None and not _JOB_ID.fullmatch(after):
            raise ValueError("Invalid cursor")
        # Use a literal validated ID because a parameter inside record syntax
        # is not accepted by all supported SurrealDB versions.
        cursor = f"AND id > job:{after} " if after else ""
        return await self.client.query(
            f"SELECT id, owner, type FROM job WHERE status = 'queued' {cursor}ORDER BY id LIMIT {int(limit)};"
        )

    async def subscribe(self) -> tuple[Any, Any]:
        query_id = await self.client.live("job")
        return query_id, await self.client.subscribe_live(query_id)
