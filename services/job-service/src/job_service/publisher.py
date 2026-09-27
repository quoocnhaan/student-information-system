"""Best-effort RabbitMQ publishing plus startup/reconnect replay."""

import asyncio
import json
import logging

import aio_pika

from job_service.config import Settings
from job_service.store import JobStore, record_id


class JobPublisher:
    def __init__(self, store: JobStore, settings: Settings) -> None:
        self.store = store
        self.settings = settings
        self.connection = None
        self.stop = asyncio.Event()
        self.reconnected = asyncio.Event()
        self.task: asyncio.Task | None = None
        self.logger = logging.getLogger(__name__)

    def start(self) -> None:
        self.task = asyncio.create_task(self.run())

    async def close(self) -> None:
        self.stop.set()
        if self.task:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
        if self.connection:
            await self.connection.close()

    async def publish(self, row: dict) -> None:
        connection = self.connection
        if connection is None or connection.is_closed or getattr(connection, "reconnecting", False):
            self.logger.warning("broker_unavailable_for_job", extra={"job_id": str(row["id"])})
            return
        channel = await connection.channel(publisher_confirms=False)
        try:
            exchange = await channel.declare_exchange("jobs.v1", aio_pika.ExchangeType.DIRECT, durable=True)
            dead = await channel.declare_exchange("jobs.dead", aio_pika.ExchangeType.TOPIC, durable=True)
            dead_queue = await channel.declare_queue("jobs.dead", durable=True)
            await dead_queue.bind(dead, routing_key="#")
            key = f"{row['owner']}.{row['type']}"
            queue = await channel.declare_queue(f"jobs.{key}", durable=True, arguments={"x-dead-letter-exchange": "jobs.dead"})
            await queue.bind(exchange, routing_key=key)
            payload = {"version": 1, "owner": row["owner"], "type": row["type"], "job_id": str(row["id"])}
            message = aio_pika.Message(
                json.dumps(payload).encode(), content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT, message_id=str(row["id"]),
            )
            await exchange.publish(message, routing_key=key, mandatory=True)
        finally:
            await channel.close()

    async def replay(self) -> None:
        cursor = None
        while not self.stop.is_set():
            rows = await self.store.queued_after(cursor, self.settings.replay_batch_size)
            if not rows:
                return
            for row in rows:
                cursor = record_id(row["id"])
                try:
                    await self.publish(row)
                except Exception:
                    self.logger.exception("replay_publish_failed", extra={"job_id": str(row["id"])})
                    if self.connection is None or self.connection.is_closed:
                        return
            if len(rows) < self.settings.replay_batch_size:
                return

    async def run(self) -> None:
        while not self.stop.is_set():
            try:
                connection = await aio_pika.connect_robust(self.settings.rabbitmq_url)
                self.connection = connection
                connection.reconnect_callbacks.add(lambda _: self.reconnected.set())
                # The first successful connection also recovers saved jobs after
                # a process crash or an initial broker outage.
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
