"""Publish durable job-row dispatch requests after SurrealDB change notifications."""

import asyncio
import logging
import signal
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from prometheus_client import start_http_server

from app.config import Settings, get_settings
from app.infrastructure.rabbitmq import RabbitMqBroker, RabbitMqPublishRejected, RabbitMqPublishTimeout
from app.infrastructure.surreal import JobLiveSubscription, SurrealDatabase, SurrealDatabaseError, _record_id
from app.observability.logging import configure_logging, get_logger
from app.observability.metrics import (
    DISPATCH_ACTIVE_LEASES,
    DISPATCH_DELAYED,
    DISPATCH_ERRORS,
    DISPATCH_PENDING,
    DISPATCH_PUBLISHES,
)


def _retry_delay(settings: Settings, attempts: int) -> float:
    return min(
        settings.dispatch_retry_base_seconds * (2 ** max(attempts - 1, 0)),
        settings.dispatch_retry_max_seconds,
    )


def _publish_result(error: Exception) -> str:
    if isinstance(error, RabbitMqPublishTimeout):
        return "timeout"
    if isinstance(error, RabbitMqPublishRejected):
        return "rejected"
    if isinstance(error, SurrealDatabaseError):
        return "database_failure"
    if isinstance(error, ConnectionError):
        return "connection_failure"
    return "other_failure"


async def drain_due_jobs(
    database: SurrealDatabase, broker: RabbitMqBroker, settings: Settings, logger: logging.Logger
) -> None:
    """Claim and publish all currently due jobs in bounded database batches."""

    while True:
        candidates = await database.get_due_dispatch_jobs(settings.dispatch_batch_size)
        if not candidates:
            return
        claimed_any = False
        for candidate in candidates:
            record_id = _record_id(candidate["id"])
            generation = int(candidate["dispatch_generation"])
            token = uuid4().hex
            job = await database.claim_job_dispatch(
                record_id, generation, token, settings.dispatch_lease_seconds
            )
            if job is None:
                continue
            claimed_any = True
            attempts = int(job["dispatch_publish_attempts"])
            try:
                await broker.publish_job_trigger(str(job["id"]), generation)
                await database.mark_job_dispatch_published(record_id, generation, token)
                DISPATCH_PUBLISHES.labels(result="published").inc()
            except Exception as error:
                DISPATCH_PUBLISHES.labels(result=_publish_result(error)).inc()
                logger.exception("job_dispatch_publish_failed", extra={"jobId": str(job["id"])})
                retry_at = datetime.now(UTC) + timedelta(seconds=_retry_delay(settings, attempts))
                try:
                    await database.mark_job_dispatch_failed(
                        record_id, generation, token, str(error), retry_at
                    )
                except SurrealDatabaseError:
                    logger.exception("job_dispatch_failure_not_recorded", extra={"jobId": str(job["id"])})
                if broker.is_closed or not broker.is_available:
                    return
        if not claimed_any or len(candidates) < settings.dispatch_batch_size:
            return


async def run_dispatcher() -> None:
    configure_logging()
    settings = get_settings()
    logger = get_logger()
    if settings.metrics_port is not None:
        start_http_server(settings.metrics_port)
    stop = asyncio.Event()
    wake = asyncio.Event()
    _install_shutdown_handlers(stop, wake)
    database = SurrealDatabase(settings)
    live_database = SurrealDatabase(settings)
    broker = RabbitMqBroker(settings)
    subscription: JobLiveSubscription | None = None
    watcher: asyncio.Task[None] | None = None

    async def watch(active: JobLiveSubscription) -> None:
        try:
            async for _job_id in active.changes():
                wake.set()
        finally:
            wake.set()

    try:
        while not stop.is_set():
            try:
                await database.connect()
                break
            except SurrealDatabaseError:
                logger.exception("dispatcher_database_connect_failed")
                await _wait(stop, wake, settings.dispatch_retry_base_seconds)
        while not stop.is_set():
            if subscription is None or watcher is None or watcher.done():
                if watcher is not None:
                    if not watcher.cancelled():
                        try:
                            watcher.result()
                        except Exception:
                            logger.exception("job_live_query_ended")
                    watcher.cancel()
                    await asyncio.gather(watcher, return_exceptions=True)
                if subscription is not None:
                    await subscription.close()
                    await live_database.close()
                subscription = None
                watcher = None
                try:
                    await live_database.connect()
                    subscription = await live_database.subscribe_to_job_changes()
                    watcher = asyncio.create_task(watch(subscription))
                    wake.set()
                except Exception:
                    logger.exception("job_live_subscription_failed")
                    await live_database.close()

            if broker.is_closed:
                try:
                    await broker.connect()
                    broker.add_reconnect_callback(wake.set)
                    wake.set()
                except Exception:
                    logger.exception("dispatcher_rabbitmq_connect_failed")
            try:
                if broker.is_available:
                    await drain_due_jobs(database, broker, settings, logger)
                counts = await database.get_dispatch_counts()
                DISPATCH_PENDING.set(counts["pending"])
                DISPATCH_ACTIVE_LEASES.set(counts["active_leases"])
                DISPATCH_ERRORS.set(counts["errors"])
                DISPATCH_DELAYED.set(counts["delayed"])
            except SurrealDatabaseError:
                logger.exception("job_dispatch_scan_failed")
                await database.close()
                try:
                    await database.connect()
                except SurrealDatabaseError:
                    logger.exception("dispatcher_database_reconnect_failed")
                    await _wait(stop, wake, settings.dispatch_retry_base_seconds)
                    continue

            timeout = settings.dispatch_reconcile_seconds
            try:
                due_at = await database.get_next_dispatch_due_at()
                if due_at is not None:
                    timeout = min(timeout, max(0.1, (due_at - datetime.now(UTC)).total_seconds()))
            except SurrealDatabaseError:
                logger.exception("job_dispatch_next_due_read_failed")
            await _wait(stop, wake, timeout)
    finally:
        if watcher is not None:
            watcher.cancel()
            await asyncio.gather(watcher, return_exceptions=True)
        if subscription is not None:
            await subscription.close()
        await broker.close()
        await live_database.close()
        await database.close()


async def _wait(stop: asyncio.Event, wake: asyncio.Event, timeout: float) -> None:
    if wake.is_set():
        wake.clear()
        return
    stop_task = asyncio.create_task(stop.wait())
    wake_task = asyncio.create_task(wake.wait())
    try:
        await asyncio.wait((stop_task, wake_task), timeout=timeout, return_when=asyncio.FIRST_COMPLETED)
    finally:
        for task in (stop_task, wake_task):
            task.cancel()
        await asyncio.gather(stop_task, wake_task, return_exceptions=True)


def _install_shutdown_handlers(stop: asyncio.Event, wake: asyncio.Event) -> None:
    loop = asyncio.get_running_loop()
    for received_signal in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(received_signal, stop.set)
        except NotImplementedError:
            signal.signal(received_signal, lambda _signal, _frame: loop.call_soon_threadsafe(stop.set))


if __name__ == "__main__":
    asyncio.run(run_dispatcher())
