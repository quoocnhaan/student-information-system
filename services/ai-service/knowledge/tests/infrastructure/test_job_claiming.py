"""Regression tests for atomic durable-job claiming."""

import asyncio
from typing import Any

import pytest

from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase


def test_specific_job_claim_is_guarded_by_durable_status() -> None:
    client = _ClaimClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    job = asyncio.run(database.claim_job("job_a", "worker-a", 180, 2))

    assert job == {"id": "job:claimed", "status": "running", "type": "ocr"}
    query, variables = client.calls[-1]
    assert "UPDATE job:job_a SET" in query
    assert "WHERE status = 'queued'" in query
    assert "next_attempt_at <= time::now()" in query
    assert "type = $job_type" not in query
    assert "dispatch_generation = $dispatch_generation" in query
    assert "sequence += 1" in query
    assert variables == {"worker_id": "worker-a", "dispatch_generation": 2}


class _ClaimClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def query(
        self, query: str, variables: dict[str, Any]
    ) -> list[dict[str, str]]:
        self.calls.append((query, variables))
        if len(self.calls) == 1:
            raise RuntimeError("Transaction conflict: Resource busy")
        return [{"id": "job:claimed", "status": "running", "type": "ocr"}]


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


def test_dispatch_claim_is_guarded_by_generation_and_due_time() -> None:
    client = _UpdateClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    job = asyncio.run(database.claim_job_dispatch("job_a", 2, "token-a", 30))

    assert job == {"id": "job:job_a"}
    assert client.call is not None
    query, variables = client.call
    assert "dispatch_generation = $generation" in query
    assert "dispatch_published_at IS NONE" in query
    assert "dispatch_lease_expires_at <= time::now()" in query
    assert "dispatch_publish_attempts += 1" in query
    assert variables == {"generation": 2, "lease_token": "token-a"}


def test_unsupported_job_type_is_rejected_before_document_transaction() -> None:
    client = _UpdateClient()
    database = SurrealDatabase(Settings())
    database._client = client

    with pytest.raises(ValueError, match="Unsupported job type: unknown"):
        asyncio.run(database.create_document_with_job(
            "doc_a", {"status": "active"}, "job_a", "unknown"
        ))

    assert client.call is None
