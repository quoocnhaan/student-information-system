"""Dedicated, opt-in MinIO source-object cleanup process."""

import asyncio
import signal

from prometheus_client import start_http_server

from app.application.orphan_cleanup import OrphanCleanup
from app.config import get_settings
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.surreal import SurrealDatabase
from app.observability.logging import configure_logging, get_logger


async def run_orphan_cleanup() -> None:
    """Run once at start and on the configured interval when explicitly enabled."""

    configure_logging()
    settings = get_settings()
    logger = get_logger()
    if not settings.orphan_cleanup_enabled:
        logger.info("orphan_cleanup_disabled")
        return
    if settings.metrics_port is not None:
        start_http_server(settings.metrics_port)
    stop = asyncio.Event()
    _install_shutdown_handlers(stop)
    database = SurrealDatabase(settings)
    await database.connect()
    try:
        cleanup = OrphanCleanup(
            MinioObjectStore(settings),
            database,
            grace_seconds=settings.orphan_cleanup_grace_seconds,
            dry_run=settings.orphan_cleanup_dry_run,
            logger=logger,
        )
        while not stop.is_set():
            await cleanup.run_once()
            try:
                await asyncio.wait_for(stop.wait(), settings.orphan_cleanup_interval_seconds)
            except TimeoutError:
                pass
    finally:
        await database.close()


def _install_shutdown_handlers(stop: asyncio.Event) -> None:
    loop = asyncio.get_running_loop()
    for received_signal in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(received_signal, stop.set)
        except NotImplementedError:
            signal.signal(received_signal, lambda _signal, _frame: loop.call_soon_threadsafe(stop.set))


if __name__ == "__main__":
    asyncio.run(run_orphan_cleanup())
