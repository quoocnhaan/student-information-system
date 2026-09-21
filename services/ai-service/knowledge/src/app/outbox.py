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
    """Drain pending rows on startup and every RabbitMQ reconnection."""

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

    try:
        while not stop.is_set():
            try:
                await broker.connect()
                break
            except Exception:
                logger.exception("rabbitmq_connect_failed")
                await _wait(stop, 2)

        if stop.is_set():
            return
        recovery_requested = asyncio.Event()
        broker.add_reconnect_callback(recovery_requested.set)
        # The initial connection is a recovery point too: publish work that an
        # API could not publish before this relay started.
        recovery_requested.set()
        while not stop.is_set():
            await _wait_for_recovery_or_stop(stop, recovery_requested)
            if stop.is_set():
                break
            recovery_requested.clear()
            await _drain_pending_events(database, broker, settings, logger)
    finally:
        await broker.close()
        await database.close()


async def _drain_pending_events(
    database: SurrealDatabase,
    broker: RabbitMqBroker,
    settings: Settings,
    logger: logging.Logger,
) -> None:
    """Drain all due events once; a later reconnect/startup retries failures."""

    while True:
        try:
            events = await database.get_pending_outbox_events(
                settings.outbox_batch_size
            )
        except SurrealDatabaseError:
            logger.exception("outbox_read_failed")
            return
        if not events:
            return

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
                return


async def _wait_for_recovery_or_stop(
    stop: asyncio.Event, recovery_requested: asyncio.Event
) -> None:
    """Sleep without querying SurrealDB until recovery work is requested."""

    stop_wait = asyncio.create_task(stop.wait())
    recovery_wait = asyncio.create_task(recovery_requested.wait())
    done, pending = await asyncio.wait(
        (stop_wait, recovery_wait), return_when=asyncio.FIRST_COMPLETED
    )
    del done
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
            signal.signal(
                received_signal,
                lambda _signal, _frame: loop.call_soon_threadsafe(stop.set),
            )


if __name__ == "__main__":
    asyncio.run(run_outbox_publisher())
