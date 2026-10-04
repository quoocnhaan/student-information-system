"""Best-effort broker publishing and queued-job replay."""

import asyncio
import logging
from collections.abc import Mapping
from typing import Any

import aio_pika

from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase, _record_id
from app.jobs.routes import Envelope, JOB_QUEUES


async def declare_topology(channel: Any) -> Any:
    exchange = await channel.declare_exchange("jobs.v1", aio_pika.ExchangeType.DIRECT, durable=True)
    dead = await channel.declare_exchange("jobs.dead", aio_pika.ExchangeType.TOPIC, durable=True)
    dead_queue = await channel.declare_queue("jobs.dead", durable=True)
    await dead_queue.bind(dead, routing_key="#")
    for key in set(JOB_QUEUES.values()):
        queue = await channel.declare_queue(
            f"jobs.{key}", durable=True,
            arguments={"x-dead-letter-exchange": "jobs.dead"},
        )
        await queue.bind(exchange, routing_key=key)
    return exchange


class JobPublisher:
    def __init__(self, store: SurrealDatabase, settings: Settings) -> None:
        self.store = store
        self.settings = settings
        self.connection: Any | None = None
        self.stop = asyncio.Event()
        self.reconnected = asyncio.Event()
        self.task: asyncio.Task[None] | None = None
        self.logger = logging.getLogger(__name__)

    @property
    def is_connected(self) -> bool:
        return bool(self.connection and not self.connection.is_closed and not getattr(self.connection, "reconnecting", False))

    def start(self) -> None:
        self.task = asyncio.create_task(self.run())

    async def close(self) -> None:
        self.stop.set()
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
        if self.connection:
            await self.connection.close()

    async def publish(self, row: Mapping[str, Any]) -> None:
        if not self.is_connected:
            self.logger.warning("broker_unavailable_for_job", extra={"job_id": str(row["id"])})
            return
        channel = await self.connection.channel(publisher_confirms=False)
        try:
            exchange = await declare_topology(channel)
            job_type = str(row["type"])
            key = JOB_QUEUES[job_type]
            message = aio_pika.Message(
                Envelope(1, job_type, str(row["id"])).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                message_id=str(row["id"]),
            )
            await exchange.publish(message, routing_key=key, mandatory=True)
        finally:
            await channel.close()

    async def replay(self) -> None:
        cursor = None
        while not self.stop.is_set():
            rows = await self.store.queued_jobs_after(cursor, self.settings.job_replay_batch_size)
            if not rows:
                return
            for row in rows:
                cursor = _record_id(row["id"])
                try:
                    await self.publish(row)
                except Exception:
                    self.logger.exception("replay_publish_failed", extra={"job_id": str(row["id"])})
                    if not self.is_connected:
                        return
            if len(rows) < self.settings.job_replay_batch_size:
                return

    async def run(self) -> None:
        while not self.stop.is_set():
            try:
                self.connection = await aio_pika.connect_robust(self.settings.rabbitmq_url)
                self.connection.reconnect_callbacks.add(lambda _: self.reconnected.set())
                await self.replay()
                while not self.stop.is_set():
                    reconnect = asyncio.create_task(self.reconnected.wait())
                    stopping = asyncio.create_task(self.stop.wait())
                    try:
                        await asyncio.wait((reconnect, stopping), return_when=asyncio.FIRST_COMPLETED)
                    finally:
                        reconnect.cancel()
                        stopping.cancel()
                        await asyncio.gather(reconnect, stopping, return_exceptions=True)
                    if self.stop.is_set():
                        break
                    self.reconnected.clear()
                    await self.replay()
            except asyncio.CancelledError:
                raise
            except Exception:
                self.logger.exception("publisher_connection_failed")
            finally:
                if self.connection:
                    await self.connection.close()
                    self.connection = None
            try:
                await asyncio.wait_for(self.stop.wait(), timeout=1)
            except TimeoutError:
                pass
