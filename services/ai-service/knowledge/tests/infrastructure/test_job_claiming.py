"""Regression tests for atomic durable-job claiming."""

import asyncio
from typing import Any

from app.infrastructure.surreal import SurrealDatabase


class _ClaimClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def query(self, query: str, variables: dict[str, Any]) -> list[dict[str, str]]:
        self.calls.append((query, variables))
        if len(self.calls) == 1:
            raise RuntimeError("Transaction conflict: Resource busy")
        return [{"id": "job:claimed", "status": "running"}]


def test_claim_retries_conflict_and_updates_a_single_selected_record() -> None:
    client = _ClaimClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    job = asyncio.run(database.claim_next_queued_job("worker-a", 180))

    assert job == {"id": "job:claimed", "status": "running"}
    assert len(client.calls) == 2
    query, variables = client.calls[-1]
    assert "UPDATE (SELECT * FROM job" in query
    assert "ORDER BY created_at LIMIT 1) SET" in query
    assert "attempts += 1" in query
    assert variables == {"worker_id": "worker-a"}
