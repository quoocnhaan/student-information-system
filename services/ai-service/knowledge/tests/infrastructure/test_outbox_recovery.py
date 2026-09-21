"""Tests for event-driven recovery delivery without an outbox polling loop."""

import asyncio
import logging

from app.config import Settings
from app.outbox import _drain_pending_events, _wait_for_recovery_or_stop


class _Database:
    def __init__(self) -> None:
        self.events = [
            {"id": "outbox_event:one", "type": "job.queued"},
            {"id": "outbox_event:two", "type": "job.status_changed"},
        ]
        self.published: list[str] = []

    async def get_pending_outbox_events(self, _limit: int):
        events, self.events = self.events, []
        return events

    async def mark_outbox_published(self, event_id: str) -> None:
        self.published.append(event_id)

    async def mark_outbox_failed(self, _event_id: str, _error: str) -> None:
        raise AssertionError("a successful delivery must not be marked failed")


class _Broker:
    def __init__(self) -> None:
        self.published: list[dict[str, object]] = []

    async def publish_outbox_event(self, event: dict[str, object]) -> None:
        self.published.append(event)


def test_recovery_drain_publishes_all_pending_events_once() -> None:
    database = _Database()
    broker = _Broker()

    asyncio.run(
        _drain_pending_events(
            database, broker, Settings(outbox_batch_size=10), logging.getLogger(__name__)
        )
    )

    assert broker.published == [
        {"id": "outbox_event:one", "type": "job.queued"},
        {"id": "outbox_event:two", "type": "job.status_changed"},
    ]
    assert database.published == ["one", "two"]


def test_recovery_wait_does_not_query_or_wake_until_requested() -> None:
    async def wait_for_request() -> None:
        stop = asyncio.Event()
        recovery_requested = asyncio.Event()
        waiter = asyncio.create_task(_wait_for_recovery_or_stop(stop, recovery_requested))
        await asyncio.sleep(0)
        assert not waiter.done()
        recovery_requested.set()
        await waiter

    asyncio.run(wait_for_request())
