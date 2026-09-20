"""Durable SurrealDB outbox publisher process."""

import asyncio
import logging
import signal

from prometheus_client import start_http_server

from app.config import Settings, get_settings
from app.infrastructure.rabbitmq import RabbitMqBroker
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError, _record_id
from app.observability.logging import configure_logging, get_logger
from app.observability.metrics import OUTBOX_PUBLISHES


async def run_outbox_publisher() -> None:
    """Publish pending rows, repair missing triggers, and stop gracefully."""

    configure_logging()
    settings = get_settings()
    logger = get_logger()
    if settings.metrics_port is not None:
        start_http_server(settings.metrics_port)
    stop = asyncio.Event()
    _install_shutdown_handlers(stop)
    database = SurrealDatabase(settings)
    broker = RabbitMqBroker(settings)
    await database.connect()
    last_sweep = 0.0

    try:
        while not stop.is_set():
            try:
                await broker.connect()
                break
            except Exception:
                logger.exception("rabbitmq_connect_failed")
                await _wait(stop, 2)

        while not stop.is_set():
            now = asyncio.get_running_loop().time()
            if now - last_sweep >= settings.recovery_sweep_seconds:
                try:
                    repaired = await database.repair_missing_job_triggers()
                    if repaired:
                        logger.warning(
                            "job_triggers_repaired", extra={"repairedCount": repaired}
                        )
                except SurrealDatabaseError:
                    logger.exception("job_trigger_repair_failed")
                last_sweep = now

            published = await _publish_batch(database, broker, settings, logger)
            if not published:
                await _wait(stop, settings.outbox_poll_seconds)
    finally:
        await broker.close()
        await database.close()


async def _publish_batch(
    database: SurrealDatabase,
    broker: RabbitMqBroker,
    settings: Settings,
    logger: logging.Logger,
) -> bool:
    try:
        events = await database.get_pending_outbox_events(settings.outbox_batch_size)
    except SurrealDatabaseError:
        logger.exception("outbox_read_failed")
        return False

    for event in events:
        event_id = _record_id(event["id"])
        event_type = str(event["type"])
        try:
            await broker.publish_outbox_event(event)
            await database.mark_outbox_published(event_id)
            OUTBOX_PUBLISHES.labels(type=event_type, result="published").inc()
        except Exception as error:
            OUTBOX_PUBLISHES.labels(type=event_type, result="failed").inc()
            logger.exception(
                "outbox_publish_failed",
                extra={"eventId": event_id, "eventType": event_type},
            )
            try:
                await database.mark_outbox_failed(event_id, str(error))
            except SurrealDatabaseError:
                logger.exception(
                    "outbox_failure_not_recorded", extra={"eventId": event_id}
                )
            return False
    return bool(events)


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
            signal.signal(
                received_signal,
                lambda _signal, _frame: loop.call_soon_threadsafe(stop.set),
            )


if __name__ == "__main__":
    asyncio.run(run_outbox_publisher())
