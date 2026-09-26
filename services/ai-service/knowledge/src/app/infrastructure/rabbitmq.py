"""RabbitMQ topology and publisher/consumer helpers."""

import asyncio
import json
from collections.abc import Awaitable, Callable
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, IncomingMessage, Message
from aio_pika.abc import AbstractRobustConnection
from pamqp import commands

from app.config import Settings
from app.observability.metrics import QUEUE_DEPTH

_JOB_ROUTING_KEY = "job.queued"
_LEGACY_OCR_ROUTING_KEY = "ocr"

JobHandler = Callable[[str, int, bool, IncomingMessage], Awaitable[None]]


class RabbitMqPublishTimeout(TimeoutError):
    """The broker may have accepted an event but did not confirm it in time."""

    def __init__(self, event_type: str, event_id: str) -> None:
        self.event_type = event_type
        self.event_id = event_id
        super().__init__(
            f"RabbitMQ publisher confirmation timed out for {event_type} event {event_id}"
        )


class RabbitMqPublishRejected(ConnectionError):
    """RabbitMQ explicitly declined a publisher-confirmed message."""


class RabbitMqBroker:
    """Own a robust connection and the knowledge-service broker topology."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._connection: AbstractRobustConnection | None = None
        self._job_queue: Any | None = None
        self._job_consumer_tag: str | None = None

    async def connect(self) -> None:
        self._connection = await aio_pika.connect_robust(self._settings.rabbitmq_url)

    async def close(self) -> None:
        if self._connection is not None:
            await self._connection.close()
            self._connection = None

    @property
    def connection(self) -> AbstractRobustConnection:
        if self._connection is None:
            raise RuntimeError("RabbitMQ has not been connected")
        return self._connection

    @property
    def is_closed(self) -> bool:
        return self._connection is None or self._connection.is_closed

    @property
    def is_available(self) -> bool:
        """Whether a live AMQP transport is available for admission/readiness."""

        connection = self._connection
        return bool(
            connection is not None
            and not connection.is_closed
            and not getattr(connection, "reconnecting", False)
            and getattr(connection, "connected", None) is not None
            and connection.connected.is_set()
        )

    def add_reconnect_callback(self, callback: Callable[[], None]) -> None:
        """Call ``callback`` after this robust connection is re-established."""

        def on_reconnect(_: AbstractRobustConnection) -> None:
            callback()

        self.connection.reconnect_callbacks.add(on_reconnect)

    async def publish_job_trigger(self, job_id: str, dispatch_generation: int) -> None:
        """Publish one durable job trigger and wait for broker confirmation."""

        channel = await self.connection.channel(publisher_confirms=True)
        try:
            exchange = await channel.declare_exchange(
                self._settings.rabbitmq_jobs_exchange,
                ExchangeType.DIRECT,
                durable=True,
            )
            await self._declare_job_queue(channel, exchange)
            payload = {"job_id": job_id, "dispatch_generation": dispatch_generation}

            message = Message(
                json.dumps(payload, default=str).encode("utf-8"),
                content_type="application/json",
                delivery_mode=DeliveryMode.PERSISTENT,
                message_id=f"{job_id}:{dispatch_generation}",
                type="job.queued",
            )
            try:
                confirmation = await asyncio.wait_for(
                    exchange.publish(message, routing_key=_JOB_ROUTING_KEY, mandatory=True),
                    timeout=self._settings.rabbitmq_publish_confirm_timeout_seconds,
                )
            except TimeoutError as error:
                raise RabbitMqPublishTimeout("job.queued", job_id) from error
            if not isinstance(confirmation, commands.Basic.Ack):
                raise RabbitMqPublishRejected(
                    f"RabbitMQ did not confirm job.queued: {confirmation!r}"
                )
        finally:
            await channel.close()

    async def consume_jobs(self, handler: JobHandler) -> None:
        """Consume durable job IDs with one in-flight delivery per worker."""

        channel = await self.connection.channel()
        await channel.set_qos(prefetch_count=1)
        exchange = await channel.declare_exchange(
            self._settings.rabbitmq_jobs_exchange,
            ExchangeType.DIRECT,
            durable=True,
        )
        queue = await self._declare_job_queue(channel, exchange)
        QUEUE_DEPTH.set(queue.declaration_result.message_count)

        async def on_message(message: IncomingMessage) -> None:
            try:
                payload = json.loads(message.body)
                job_id = payload["job_id"]
                generation = payload["dispatch_generation"]
                if (
                    not isinstance(job_id, str)
                    or not isinstance(generation, int)
                    or isinstance(generation, bool)
                    or generation < 1
                ):
                    raise ValueError("Invalid job delivery")
            except (
                json.JSONDecodeError, KeyError, TypeError, ValueError,
                UnicodeDecodeError, AttributeError,
            ):
                await message.reject(requeue=False)
                return

            try:
                await handler(
                    job_id, generation, bool(message.redelivered), message
                )
            except Exception:
                if not message.processed:
                    await message.nack(requeue=True)
                raise

        self._job_queue = queue
        self._job_consumer_tag = await queue.consume(on_message)

    async def stop_consuming_jobs(self) -> None:
        """Stop new deliveries while allowing an active handler to finish."""

        if self._job_queue is not None and self._job_consumer_tag is not None:
            await self._job_queue.cancel(self._job_consumer_tag)
        self._job_queue = None
        self._job_consumer_tag = None

    async def refresh_queue_depth(self) -> None:
        """Refresh the ready-message gauge without consuming a delivery."""

        channel = await self.connection.channel()
        try:
            queue = await channel.declare_queue(
                self._settings.rabbitmq_jobs_queue, passive=True
            )
            QUEUE_DEPTH.set(queue.declaration_result.message_count)
        finally:
            await channel.close()

    async def _declare_job_queue(self, channel: Any, exchange: Any) -> Any:
        queue = await channel.declare_queue(
            self._settings.rabbitmq_jobs_queue, durable=True
        )
        await queue.bind(exchange, routing_key=_JOB_ROUTING_KEY)
        await queue.bind(exchange, routing_key=_LEGACY_OCR_ROUTING_KEY)
        return queue
