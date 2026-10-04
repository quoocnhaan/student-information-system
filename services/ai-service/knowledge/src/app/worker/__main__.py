"""RabbitMQ consumer for one or more Knowledge workload queues."""

import asyncio
import logging
import signal
from uuid import uuid4

import aio_pika

from app.config import get_settings
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.surreal import SurrealDatabase
from app.jobs.publisher import JobPublisher, declare_topology
from app.jobs.routes import Envelope, JOB_QUEUES
from app.observability.logging import configure_logging
from app.worker.core import FailurePersistenceError, Registry, execute
from app.worker.ocr import OcrPdfHandler
from app.worker.index import IndexDocumentHandler, ReembedChunkHandler
from app.worker.correct import CorrectChunksHandler


def make_registry(settings, database, objects) -> Registry:
    registry = Registry()
    registry.register(OcrPdfHandler(settings, database, objects))
    registry.register(IndexDocumentHandler(settings, database))
    registry.register(CorrectChunksHandler(settings, database))
    registry.register(ReembedChunkHandler(settings, database))
    return registry


async def publish_followups(publisher, jobs) -> None:
    """Attempt every committed child independently; queued replay recovers faults."""
    for row in jobs:
        try:
            await publisher.publish(row)
        except Exception:
            logging.getLogger(__name__).exception("followup_publication_failed", extra={"job_id": str(row["id"])})


async def run() -> None:
    configure_logging()
    settings = get_settings()
    queues = {name.strip() for name in settings.worker_queues.split(",") if name.strip()}
    if not queues or not queues.issubset(set(JOB_QUEUES.values())):
        raise ValueError("Unknown worker queue")
    if not settings.worker_id:
        raise ValueError("KNOWLEDGE_WORKER_ID is required for workers")
    database = SurrealDatabase(settings)
    await database.connect()
    worker_run_id = uuid4().hex
    try:
        await database.recover_abandoned_jobs(worker_run_id)
    except BaseException:
        await database.close()
        raise
    objects = MinioObjectStore(settings)
    registry = make_registry(settings, database, objects)
    required = {job_type for job_type, queue in JOB_QUEUES.items() if queue in queues}
    if required != {handler.type for handler in registry.handlers.values() if handler.type in required}:
        raise RuntimeError("Worker queue has an unhandled job type")

    shutdown = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown.set)
        except NotImplementedError:
            signal.signal(sig, lambda *_: loop.call_soon_threadsafe(shutdown.set))

    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    publisher = JobPublisher(database, settings)
    publisher.start()
    channels = []
    consumers = []
    active: set[asyncio.Task] = set()
    fatal = False
    try:
        for queue_name in queues:
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=1)
            await declare_topology(channel)
            queue = await channel.declare_queue(
                f"jobs.{queue_name}", durable=True,
                arguments={"x-dead-letter-exchange": "jobs.dead"},
            )

            async def on_message(message, expected_queue=queue_name):
                nonlocal fatal
                if fatal:
                    await message.nack(requeue=True)
                    return
                current = asyncio.current_task()
                if current is not None:
                    active.add(current)
                try:
                    try:
                        envelope = Envelope.decode(message.body)
                    except (ValueError, UnicodeError):
                        await message.reject(requeue=False)
                        return
                    if JOB_QUEUES.get(envelope.type) != expected_queue:
                        await message.reject(requeue=False)
                        return
                    handler = registry.get(envelope)
                    if handler is None:
                        await message.reject(requeue=False)
                        return
                    processing = SurrealDatabase(settings)
                    processing.worker_run_id = worker_run_id
                    try:
                        await processing.connect()
                        local_handler = make_registry(settings, processing, objects).get(envelope)
                        next_job = await execute(envelope, local_handler, processing, message, settings)
                    finally:
                        try:
                            await processing.close()
                        except Exception:
                            logging.getLogger(__name__).exception("processing_connection_close_failed")
                    if next_job is not None:
                        # Single-chunk correction has a durable child.  Publish only after its parent
                        # commit has completed.
                        jobs = next_job if isinstance(next_job, (list, tuple)) else [next_job]
                        await publish_followups(publisher, jobs)
                except FailurePersistenceError:
                    fatal = True
                    shutdown.set()
                    logging.getLogger(__name__).exception("worker_failure_persistence_pending")
                except Exception:
                    logging.getLogger(__name__).exception("delivery_failed")
                    if not message.processed:
                        await message.nack(requeue=True)
                finally:
                    if current is not None:
                        active.discard(current)

            tag = await queue.consume(on_message)
            consumers.append((queue, tag))
            channels.append(channel)
        await shutdown.wait()
    finally:
        for queue, tag in consumers:
            await queue.cancel(tag)
        if fatal:
            for task in active:
                task.cancel()
        if active:
            await asyncio.gather(*active, return_exceptions=True)
        for channel in channels:
            await channel.close()
        await connection.close()
        await publisher.close()
        await database.close()
    if fatal:
        raise FailurePersistenceError("Worker exited with failure persistence pending")


if __name__ == "__main__":
    asyncio.run(run())
