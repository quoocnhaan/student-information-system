"""Dispatch recovery is driven by the durable job row."""

import asyncio
import logging
from datetime import datetime

from app.config import Settings
from app.dispatcher import _retry_delay, drain_due_jobs
from app.infrastructure.surreal import JobLiveSubscription, SurrealDatabase


class _Database:
    def __init__(self) -> None:
        self.candidates = [{"id": "job:job_a", "dispatch_generation": 2}]
        self.published: list[tuple[str, int, str]] = []
        self.failed: list[tuple[str, int, str, str, datetime]] = []

    async def get_due_dispatch_jobs(self, _limit: int):
        candidates, self.candidates = self.candidates, []
        return candidates

    async def claim_job_dispatch(self, record_id: str, generation: int, token: str, _lease: int):
        assert (record_id, generation) == ("job_a", 2)
        return {"id": "job:job_a", "dispatch_publish_attempts": 1}

    async def mark_job_dispatch_published(self, record_id: str, generation: int, token: str):
        self.published.append((record_id, generation, token))
        return True

    async def mark_job_dispatch_failed(self, record_id, generation, token, error, retry_at):
        self.failed.append((record_id, generation, token, error, retry_at))
        return True


class _Broker:
    is_closed = False
    is_available = True

    def __init__(self, failure: bool = False) -> None:
        self.failure = failure
        self.sent: list[tuple[str, int]] = []

    async def publish_job_trigger(self, job_id: str, generation: int) -> None:
        if self.failure:
            raise ConnectionError("broker unavailable")
        self.sent.append((job_id, generation))


def test_due_job_is_published_and_marked_with_its_lease_token() -> None:
    database = _Database()
    broker = _Broker()
    asyncio.run(drain_due_jobs(database, broker, Settings(), logging.getLogger(__name__)))

    assert broker.sent == [("job:job_a", 2)]
    assert len(database.published) == 1
    assert database.published[0][:2] == ("job_a", 2)
    assert database.published[0][2]
    assert database.failed == []


def test_failed_publish_leaves_job_due_after_backoff() -> None:
    database = _Database()
    broker = _Broker(failure=True)
    asyncio.run(drain_due_jobs(database, broker, Settings(), logging.getLogger(__name__)))

    assert database.published == []
    assert len(database.failed) == 1
    assert database.failed[0][:2] == ("job_a", 2)
    assert database.failed[0][3] == "broker unavailable"


def test_retry_delay_is_bounded() -> None:
    settings = Settings(dispatch_retry_base_seconds=0.5, dispatch_retry_max_seconds=2)
    assert [_retry_delay(settings, attempt) for attempt in (1, 2, 10)] == [0.5, 1, 2]


def test_job_live_subscription_exposes_changed_record_id() -> None:
    async def notifications():
        yield {"action": "CREATE", "result": {"id": "job:job_a"}}
        yield {"action": "UPDATE", "result": {"id": "job:job_b"}}

    async def scenario() -> list[str | None]:
        subscription = JobLiveSubscription(object(), "query", notifications())
        return [job_id async for job_id in subscription.changes()]

    assert asyncio.run(scenario()) == ["job:job_a", "job:job_b"]


def test_dispatch_result_updates_guard_generation_and_token() -> None:
    class _Client:
        def __init__(self) -> None:
            self.calls = []

        async def query(self, query, variables):
            self.calls.append((query, variables))
            return [{"id": "job:job_a"}]

    client = _Client()
    database = object.__new__(SurrealDatabase)
    database._client = client
    assert asyncio.run(database.mark_job_dispatch_published("job_a", 2, "token-a"))
    query, variables = client.calls[0]
    assert "dispatch_generation = $generation AND dispatch_lease_owner = $lease_token" in query
    assert "status INSIDE ['queued', 'running']" in query
    assert "sequence += 1" not in query
    assert variables == {"generation": 2, "lease_token": "token-a"}
