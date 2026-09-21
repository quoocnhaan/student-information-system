"""Regression tests for atomic durable-job claiming."""

import asyncio
from typing import Any

from app.infrastructure.surreal import SurrealDatabase


def test_specific_job_claim_is_guarded_by_durable_status() -> None:
    client = _ClaimClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    job = asyncio.run(database.claim_job("job_a", "worker-a", 180))

    assert job == {"id": "job:claimed", "status": "running"}
    query, variables = client.calls[-1]
    assert "UPDATE job:job_a SET" in query
    assert "WHERE status = 'queued'" in query
    assert "next_attempt_at <= time::now()" in query
    assert "sequence += 1" in query
    assert variables == {"worker_id": "worker-a"}


class _ClaimClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def query(
        self, query: str, variables: dict[str, Any]
    ) -> list[dict[str, str]]:
        self.calls.append((query, variables))
        if len(self.calls) == 1:
            raise RuntimeError("Transaction conflict: Resource busy")
        return [{"id": "job:claimed", "status": "running"}]


class _UpdateClient:
    def __init__(self) -> None:
        self.call: tuple[str, dict[str, Any]] | None = None

    async def query(
        self, query: str, variables: dict[str, Any]
    ) -> list[dict[str, str]]:
        self.call = (query, variables)
        return [{"id": "job:job_a"}]


def test_progress_update_enforces_worker_ownership_and_increments_sequence() -> None:
    client = _UpdateClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    updated = asyncio.run(
        database.update_job("job_a", {"progress": 25}, worker_id="worker-a")
    )

    assert updated is True
    assert client.call is not None
    query, variables = client.call
    assert "progress = $changes.progress" in query
    assert "sequence += 1" in query
    assert "status = 'running' AND worker_id = $worker_id" in query
    assert variables == {"changes": {"progress": 25}, "worker_id": "worker-a"}


def test_new_job_dispatch_lookup_only_reads_its_unpublished_trigger() -> None:
    client = _UpdateClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    event = asyncio.run(database.get_pending_job_dispatch_event("job_a"))

    assert event == {"id": "job:job_a"}
    assert client.call is not None
    query, variables = client.call
    assert "type = 'job.queued'" in query
    assert "job_id = job:job_a" in query
    assert "published_at IS NONE" in query
    assert variables == {"dispatch_generation": 1}
