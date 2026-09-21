"""Single-process durable job worker for local Docker Compose."""

import asyncio
import random
import re
import signal
from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from time import perf_counter
from typing import Any

import httpx
from prometheus_client import start_http_server

from app.application.ocr_jobs import OcrJobProcessor, PermanentJobError
from app.config import Settings, get_settings
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.ocr import LmStudioOcr, OcrError
from app.infrastructure.rabbitmq import RabbitMqBroker
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError
from app.observability.logging import configure_logging, get_logger
from app.observability.metrics import (
    EXPIRED_LEASES,
    JOB_CLAIMS,
    JOB_RETRIES,
    OCR_DOCUMENT_SECONDS,
    RABBIT_REDELIVERIES,
    TERMINAL_FAILURES,
)

_JOB_RECORD_ID = re.compile(r"job_[0-9a-f]{32}")


async def run_worker() -> None:
    """Claim jobs safely, finish in-flight work on shutdown, and then exit."""

    configure_logging()
    settings = get_settings()
    logger = get_logger()
    if settings.metrics_port is not None:
        start_http_server(settings.metrics_port)
    shutdown = asyncio.Event()
    _install_shutdown_handlers(shutdown)

    database = SurrealDatabase(settings)
    await database.connect()
    if settings.surreal_apply_schema_on_startup:
        await database.apply_schema()
    await database.requeue_expired_jobs()
    processors = {
        "ocr": OcrJobProcessor(
            database, MinioObjectStore(settings), LmStudioOcr(settings)
        )
    }

    if not settings.rabbitmq_enabled:
        raise RuntimeError("RabbitMQ must be enabled before a worker can start jobs")

    broker: RabbitMqBroker | None = None
    processing_lock = asyncio.Lock()

    async def consume_job(job_id: str, redelivered: bool, message: Any) -> None:
        if shutdown.is_set():
            await message.nack(requeue=True)
            return
        # RabbitMQ is the admission boundary. A delivery observed while its
        # robust connection is recovering must not become a new durable claim.
        if broker is None or not broker.is_available:
            await message.nack(requeue=True)
            return
        if redelivered:
            RABBIT_REDELIVERIES.inc()
        record_id = job_id.removeprefix("job:")
        if _JOB_RECORD_ID.fullmatch(record_id) is None:
            await message.reject(requeue=False)
            return
        async with processing_lock:
            job = await database.claim_job(
                record_id, settings.worker_id, settings.worker_lease_seconds
            )
            if job is None:
                JOB_CLAIMS.labels(result="ignored").inc()
                await message.ack()
                return
            JOB_CLAIMS.labels(result="claimed").inc()
            # The durable claim decision is the acknowledgment boundary.
            await message.ack()
            await _process_claimed_job(database, processors, job, settings, logger)

    try:
        # Consumption is established before the worker enters its recovery loop;
        # the worker has no database-based path for starting queued jobs.
        while not shutdown.is_set() and broker is None:
            candidate = RabbitMqBroker(settings)
            try:
                await candidate.connect()
                await candidate.consume_jobs(consume_job)
                broker = candidate
                logger.info("rabbitmq_consumer_connected")
            except Exception:
                logger.exception("rabbitmq_consumer_connect_failed")
                await candidate.close()
                await _wait_for_shutdown(shutdown, 1)

        last_sweep = 0.0
        while not shutdown.is_set():
            now = asyncio.get_running_loop().time()
            if now - last_sweep >= settings.recovery_sweep_seconds:
                recovered = await database.requeue_expired_jobs()
                if recovered:
                    EXPIRED_LEASES.inc(recovered)
                    logger.warning(
                        "expired_job_leases_requeued",
                        extra={"recoveredCount": recovered},
                    )
                last_sweep = now
                if broker is not None and broker.is_closed:
                    await broker.close()
                    broker = None
                if broker is None:
                    candidate = RabbitMqBroker(settings)
                    try:
                        await candidate.connect()
                        await candidate.consume_jobs(consume_job)
                        broker = candidate
                        logger.info("rabbitmq_consumer_connected")
                    except Exception:
                        logger.exception("rabbitmq_consumer_connect_failed")
                        await candidate.close()
                if broker is not None:
                    try:
                        await broker.refresh_queue_depth()
                    except Exception:
                        logger.exception("queue_depth_refresh_failed")

            # Lease recovery is deliberately separate from admission: it only
            # requeues and emits a durable outbox trigger. A later AMQP delivery
            # is required before that job can run again.
            await _wait_for_shutdown(shutdown, 0.25)
    finally:
        if broker is not None:
            await broker.stop_consuming_jobs()
        async with processing_lock:
            pass
        if broker is not None:
            await broker.close()
        await database.close()


async def _process_claimed_job(
    database: SurrealDatabase,
    processors: Mapping[str, OcrJobProcessor],
    job: Mapping[str, Any],
    settings: Settings,
    logger: Any,
) -> None:
    """Run one claimed job with a lease heartbeat and central failure policy."""

    job_id = _record_id(job["id"])
    job_type = str(job["type"])
    processor = processors.get(job_type)
    lease_stop = asyncio.Event()
    lease_task = asyncio.create_task(
        _maintain_lease(database, job_id, settings, lease_stop, logger)
    )
    started_at = perf_counter()

    try:
        if processor is None:
            raise PermanentJobError(f"Unsupported job type: {job_type}")

        logger.info("job_claimed", extra={"jobId": job_id, "jobType": job_type})
        await processor.process(job)
    except Exception as error:
        logger.exception("job_failed", extra={"jobId": job_id, "jobType": job_type})
        await _handle_job_failure(database, job, settings, error, logger)
    finally:
        lease_stop.set()
        await lease_task
        OCR_DOCUMENT_SECONDS.observe(perf_counter() - started_at)


async def _handle_job_failure(
    database: SurrealDatabase,
    job: Mapping[str, Any],
    settings: Settings,
    error: Exception,
    logger: Any,
) -> None:
    """Schedule retryable failures or permanently block their source document."""

    job_id = _record_id(job["id"])
    attempts = int(job.get("attempts", 1))
    max_attempts = int(job.get("max_attempts", settings.job_max_attempts))
    retry_at = (
        _retry_at(settings, attempts)
        if _is_retryable(error) and attempts < max_attempts
        else None
    )
    try:
        final_job = await database.schedule_retry_or_fail(
            job_id,
            settings.worker_id,
            str(error) or "Job processing failed",
            retry_at,
        )
    except SurrealDatabaseError:
        logger.exception("job_failure_not_persisted", extra={"jobId": job_id})
        return

    if final_job is None:
        logger.error("job_failure_ownership_lost", extra={"jobId": job_id})
        return
    if final_job["status"] == "failed":
        TERMINAL_FAILURES.inc()
        document_id = _record_id(job["document_id"])
        try:
            await database.fail_document(document_id)
        except SurrealDatabaseError:
            logger.exception("failed_document_not_marked", extra={"jobId": job_id})
    else:
        JOB_RETRIES.inc()
        logger.info(
            "job_retry_scheduled",
            extra={"jobId": job_id, "retryAt": str(retry_at)},
        )


async def _maintain_lease(
    database: SurrealDatabase,
    job_id: str,
    settings: Settings,
    stop: asyncio.Event,
    logger: Any,
) -> None:
    """Renew the claim lease while a processor is doing asynchronous work."""

    while True:
        try:
            await asyncio.wait_for(
                stop.wait(), timeout=settings.worker_heartbeat_seconds
            )
            return
        except TimeoutError:
            pass

        try:
            renewed = await database.renew_job_lease(
                job_id, settings.worker_id, settings.worker_lease_seconds
            )
            if not renewed:
                logger.error("job_lease_lost", extra={"jobId": job_id})
                return
        except SurrealDatabaseError:
            logger.exception("job_lease_renewal_failed", extra={"jobId": job_id})


def _retry_at(settings: Settings, attempts: int) -> datetime:
    """Use capped exponential backoff with small jitter for retryable failures."""

    delay = min(
        settings.job_retry_base_seconds * (2 ** max(attempts - 1, 0)),
        settings.job_retry_max_seconds,
    )
    return datetime.now(UTC) + timedelta(seconds=delay + random.uniform(0, delay * 0.1))


def _is_retryable(error: Exception) -> bool:
    """Classify malformed source data as permanent; network failures can retry."""

    current: BaseException | None = error
    while current is not None:
        if isinstance(current, httpx.HTTPError):
            return True
        current = current.__cause__
    return not isinstance(error, (OcrError, PermanentJobError))


async def _wait_for_shutdown(shutdown: asyncio.Event, timeout_seconds: float) -> None:
    """Sleep until either polling should resume or a graceful shutdown begins."""

    try:
        await asyncio.wait_for(shutdown.wait(), timeout=timeout_seconds)
    except TimeoutError:
        pass


def _install_shutdown_handlers(shutdown: asyncio.Event) -> None:
    """Set a flag on SIGTERM/SIGINT; the active job is allowed to finish."""

    loop = asyncio.get_running_loop()
    for received_signal in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(received_signal, shutdown.set)
        except NotImplementedError:
            signal.signal(
                received_signal,
                lambda _signal, _frame: loop.call_soon_threadsafe(shutdown.set),
            )


def _record_id(value: Any) -> str:
    """Return the identifier part of a Surreal record ID."""

    if hasattr(value, "id"):
        return str(value.id)
    return str(value).split(":", maxsplit=1)[-1]


if __name__ == "__main__":
    asyncio.run(run_worker())
