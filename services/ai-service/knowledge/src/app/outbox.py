"""Event-driven durable SurrealDB outbox publisher process."""

import asyncio
import logging
import signal
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from prometheus_client import start_http_server

from app.config import Settings, get_settings
from app.infrastructure.rabbitmq import (
    RabbitMqBroker,
    RabbitMqPublishRejected,
    RabbitMqPublishTimeout,
)
from app.infrastructure.surreal import (
    OutboxLiveSubscription,
    SurrealDatabase,
    SurrealDatabaseError,
    _record_id,
)
from app.observability.logging import configure_logging, get_logger
from app.observability.metrics import OUTBOX_PUBLISHES


@dataclass(frozen=True)
class DrainResult:
    """The relay's next scheduling decision after a serialized drain."""

    failed: bool = False


async def run_outbox_publisher() -> None:
    """Relay durable events on live-query notifications, not idle polling."""

    configure_logging()
    settings = get_settings()
    logger = get_logger()
    if settings.metrics_port is not None:
        start_http_server(settings.metrics_port)
    stop = asyncio.Event()
    wake = asyncio.Event()
    _install_shutdown_handlers(stop)

    database = SurrealDatabase(settings)
    live_database = SurrealDatabase(settings)
    broker = RabbitMqBroker(settings)
    subscription: OutboxLiveSubscription | None = None
    subscription_task: asyncio.Task[None] | None = None
    timer_task: asyncio.Task[None] | None = None
    drain_lock = asyncio.Lock()
    retry_attempts = 0
    retry_until: float | None = None

    async def watch_subscription(active: OutboxLiveSubscription) -> None:
        try:
            async for _ in active.changes():
                wake.set()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("outbox_live_query_ended")

    async def start_subscription() -> tuple[OutboxLiveSubscription, asyncio.Task[None]]:
        await live_database.connect()
        active = await live_database.subscribe_to_outbox_changes()
        # Subscribe before initial drain so commits cannot fall through a gap.
        return active, asyncio.create_task(watch_subscription(active))

    def schedule_wake(delay_seconds: float | None) -> None:
        nonlocal timer_task
        if timer_task is not None:
            timer_task.cancel()
        timer_task = None
        if delay_seconds is not None:
            timer_task = asyncio.create_task(_wake_after(wake, delay_seconds))

    async def drain_and_schedule() -> None:
        nonlocal retry_attempts, retry_until
        async with drain_lock:
            result = await _drain_pending_events(database, broker, settings, logger)
            if result.failed:
                retry_attempts += 1
                delay = _retry_delay(settings, retry_attempts)
                # Marking a failed event emits its own live-query notification.
                # Keep that wake coalesced behind this retry deadline instead of
                # letting it immediately re-enter the drain.
                retry_until = asyncio.get_running_loop().time() + delay
                schedule_wake(delay)
                return
            retry_attempts = 0
            retry_until = None
            try:
                available_at = await database.get_earliest_pending_outbox_available_at()
            except SurrealDatabaseError:
                logger.exception("outbox_next_availability_read_failed")
                delay = _retry_delay(settings, 1)
                retry_until = asyncio.get_running_loop().time() + delay
                schedule_wake(delay)
                return
            schedule_wake(_seconds_until(available_at))

    try:
        while not stop.is_set():
            try:
                await database.connect()
                break
            except SurrealDatabaseError:
                # Schema/application startup can lag the database container.
                logger.exception("outbox_database_connect_failed")
                await _wait(stop, settings.outbox_retry_base_seconds)
        if stop.is_set():
            return
        while not stop.is_set():
            if subscription is None or (subscription_task is not None and subscription_task.done()):
                if subscription is not None:
                    await subscription.close()
                    await live_database.close()
                try:
                    subscription, subscription_task = await start_subscription()
                    wake.set()  # catch up after subscription/reconnection
                    logger.info("outbox_live_subscription_connected")
                except Exception:
                    logger.exception("outbox_live_subscription_failed")
                    await _wait(stop, settings.outbox_retry_base_seconds)
                    continue

            if broker.is_closed:
                try:
                    await broker.connect()
                    broker.add_reconnect_callback(wake.set)
                    wake.set()
                    logger.info("outbox_rabbitmq_connected")
                except Exception:
                    logger.exception("rabbitmq_connect_failed")
                    await _wait(stop, settings.outbox_retry_base_seconds)
                    continue

            # A robust connection can be temporarily reconnecting. Do not publish
            # or query until its callback wakes a post-reconnect drain.
            if not broker.is_available:
                await _wait(stop, 0.1)
                continue

            if retry_until is not None:
                remaining = retry_until - asyncio.get_running_loop().time()
                if remaining > 0:
                    await _wait(stop, remaining)
                    continue
                retry_until = None

            await _wait_for_recovery_or_stop(stop, wake)
            if stop.is_set():
                break
            wake.clear()
            await drain_and_schedule()
    finally:
        if timer_task is not None:
            timer_task.cancel()
            await asyncio.gather(timer_task, return_exceptions=True)
        if subscription_task is not None:
            subscription_task.cancel()
            await asyncio.gather(subscription_task, return_exceptions=True)
        if subscription is not None:
            await subscription.close()
        await broker.close()
        await live_database.close()
        await database.close()


async def _drain_pending_events(
    database: SurrealDatabase,
    broker: RabbitMqBroker,
    settings: Settings,
    logger: logging.Logger,
) -> DrainResult:
    """Publish all currently due rows once, one confirmation at a time."""

    while True:
        try:
            events = await database.get_pending_outbox_events(settings.outbox_batch_size)
        except SurrealDatabaseError:
            logger.exception("outbox_read_failed")
            return DrainResult(failed=True)
        if not events:
            return DrainResult()

        for event in events:
            event_id = _record_id(event["id"])
            event_type = str(event["type"])
            try:
                await broker.publish_outbox_event(event)
                await database.mark_outbox_published(event_id)
                OUTBOX_PUBLISHES.labels(type=event_type, result="published").inc()
            except Exception as error:
                OUTBOX_PUBLISHES.labels(type=event_type, result=_publish_result(error)).inc()
                logger.exception("outbox_publish_failed", extra={"eventId": event_id, "eventType": event_type})
                try:
                    await database.mark_outbox_failed(event_id, str(error))
                except SurrealDatabaseError:
                    logger.exception("outbox_failure_not_recorded", extra={"eventId": event_id})
                return DrainResult(failed=True)


def _publish_result(error: Exception) -> str:
    """Keep metric result labels finite and diagnostically useful."""

    if isinstance(error, RabbitMqPublishTimeout):
        return "timeout"
    if isinstance(error, RabbitMqPublishRejected):
        return "rejected"
    return "connection_failure"


def _seconds_until(value: Any | None) -> float | None:
    """Convert a Surreal datetime value into one cancellable timer delay."""

    if value is None:
        return None
    if hasattr(value, "datetime"):
        value = value.datetime
    if not isinstance(value, datetime):
        return 0.0
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return max(0.0, (value - datetime.now(UTC)).total_seconds())


def _retry_delay(settings: Settings, attempts: int) -> float:
    """Return a bounded retry delay without consulting the database."""

    return min(
        settings.outbox_retry_base_seconds * (2 ** max(attempts - 1, 0)),
        settings.outbox_retry_max_seconds,
    )


async def _wake_after(wake: asyncio.Event, seconds: float) -> None:
    await asyncio.sleep(seconds)
    wake.set()


async def _wait_for_recovery_or_stop(stop: asyncio.Event, recovery_requested: asyncio.Event) -> None:
    """Wait for a notification/timer; this makes no database query while idle."""

    stop_wait = asyncio.create_task(stop.wait())
    recovery_wait = asyncio.create_task(recovery_requested.wait())
    _done, pending = await asyncio.wait((stop_wait, recovery_wait), return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    await asyncio.gather(*pending, return_exceptions=True)


async def _wait(stop: asyncio.Event, seconds: float) -> None:
    try:
        await asyncio.wait_for(stop.wait(), timeout=seconds)
    except TimeoutError:
        pass


def _install_shutdown_handlers(stop: asyncio.Event) -> None:
    loop = asyncio.get_running_loop()
    for received_signal in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(received_signal, stop.set)
        except NotImplementedError:
            signal.signal(received_signal, lambda _signal, _frame: loop.call_soon_threadsafe(stop.set))


if __name__ == "__main__":
    asyncio.run(run_outbox_publisher())
