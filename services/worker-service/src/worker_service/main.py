"""RabbitMQ consumer process for registered service job types."""

import asyncio
import logging
import signal

import aio_pika

from worker_service.clients import JobClient, KnowledgeClient
from worker_service.config import get_settings
from worker_service.core import Envelope, Registry, execute
from worker_service.ocr import KnowledgeOcrHandler


async def run() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    jobs = JobClient(settings)
    knowledge = KnowledgeClient(settings)
    registry = Registry()
    registry.register(KnowledgeOcrHandler(settings, knowledge, jobs))
    enabled = {tuple(item.strip().split(":", 1)) for item in settings.enabled_handlers.split(",") if item.strip()}
    if enabled != {(handler.owner, handler.type) for handler in registry.handlers.values()}:
        raise RuntimeError("Enabled handlers and registered processors differ")
    shutdown = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown.set)
        except NotImplementedError:
            signal.signal(sig, lambda *_: loop.call_soon_threadsafe(shutdown.set))
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    channels = []
    consumers = []
    active: set[asyncio.Task] = set()
    try:
        for handler in registry.handlers.values():
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=1)
            exchange = await channel.declare_exchange("jobs.v1", aio_pika.ExchangeType.DIRECT, durable=True)
            dead = await channel.declare_exchange("jobs.dead", aio_pika.ExchangeType.TOPIC, durable=True)
            dead_queue = await channel.declare_queue("jobs.dead", durable=True)
            await dead_queue.bind(dead, routing_key="#")
            key = f"{handler.owner}.{handler.type}"
            queue = await channel.declare_queue(
                f"jobs.{key}", durable=True, arguments={"x-dead-letter-exchange": "jobs.dead"}
            )
            await queue.bind(exchange, routing_key=key)

            async def on_message(message, expected=(handler.owner, handler.type, handler.version)):
                current = asyncio.current_task()
                if current is not None:
                    active.add(current)
                try:
                    try:
                        envelope = Envelope.decode(message.body)
                    except (ValueError, UnicodeError):
                        await message.reject(requeue=False)
                        return
                    if (envelope.owner, envelope.type, envelope.version) != expected:
                        await message.reject(requeue=False)
                        return
                    selected = registry.get(envelope)
                    if selected is None:
                        await message.reject(requeue=False)
                        return
                    try:
                        await execute(envelope, selected, jobs, message)
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
        await jobs.close()
        await knowledge.close()


if __name__ == "__main__":
    asyncio.run(run())
