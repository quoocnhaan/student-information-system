"""RabbitMQ consumer for one or more Knowledge workload queues."""

import asyncio
import logging
import signal

import aio_pika

from app.config import get_settings
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.surreal import SurrealDatabase
from app.jobs.publisher import JobPublisher, declare_topology
from app.jobs.routes import Envelope, JOB_QUEUES
from app.worker.core import Registry, execute
from app.worker.ocr import OcrPdfHandler
from app.worker.correct import CorrectOcrHandler
from app.worker.index import IndexDocumentHandler, ReembedChunkHandler
from app.worker.correct import CorrectChunksHandler


async def run() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    queues = {name.strip() for name in settings.worker_queues.split(",") if name.strip()}
    if not queues or not queues.issubset(set(JOB_QUEUES.values())):
        raise ValueError("Unknown worker queue")
    database = SurrealDatabase(settings)
    await database.connect()
    objects = MinioObjectStore(settings)
    registry = Registry()
    registry.register(OcrPdfHandler(settings, database, objects))
    registry.register(CorrectOcrHandler(settings, database))
    registry.register(IndexDocumentHandler(settings, database))
    registry.register(CorrectChunksHandler(settings, database))
    registry.register(ReembedChunkHandler(settings, database))
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
                    next_job = await execute(envelope, handler, database, message)
                    if next_job is not None:
                        await publisher.publish(next_job)
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
        if active:
            await asyncio.gather(*active, return_exceptions=True)
        for channel in channels:
            await channel.close()
        await connection.close()
        await publisher.close()
        await database.close()


if __name__ == "__main__":
    asyncio.run(run())
