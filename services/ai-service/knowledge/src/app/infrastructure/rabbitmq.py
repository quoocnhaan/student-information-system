"""RabbitMQ topology and publisher/consumer helpers."""

import asyncio
import json
from collections.abc import Awaitable, Callable, Mapping
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, IncomingMessage, Message
from aio_pika.abc import AbstractRobustConnection
from pamqp import commands

from app.config import Settings
from app.observability.metrics import QUEUE_DEPTH

JobHandler = Callable[[str, bool, IncomingMessage], Awaitable[None]]
StatusHandler = Callable[[Mapping[str, Any]], Awaitable[None]]


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

    async def publish_outbox_event(self, event: Mapping[str, Any]) -> None:
        """Publish one durable outbox row and wait for broker confirmation."""

        event_type = str(event["type"])
        channel = await self.connection.channel(publisher_confirms=True)
        try:
            if event_type == "job.queued":
                exchange = await channel.declare_exchange(
                    self._settings.rabbitmq_jobs_exchange,
                    ExchangeType.DIRECT,
                    durable=True,
                )
                await self._declare_job_queue(channel, exchange)
                payload = {
                    "event_type": event_type,
                    "job_id": str(event["job_id"]),
                    "dispatch_generation": event.get("dispatch_generation"),
                }
                routing_key = "ocr"
            elif event_type == "job.status_changed":
                exchange = await channel.declare_exchange(
                    self._settings.rabbitmq_status_exchange,
                    ExchangeType.TOPIC,
                    durable=True,
                )
                payload = _status_payload(event)
                routing_key = event_type
            else:
                raise ValueError(f"Unsupported outbox event type: {event_type}")

            message = Message(
                json.dumps(payload, default=str).encode("utf-8"),
                content_type="application/json",
                delivery_mode=DeliveryMode.PERSISTENT,
                message_id=str(event["id"]),
                type=event_type,
            )
            try:
                confirmation = await asyncio.wait_for(
                    exchange.publish(message, routing_key=routing_key, mandatory=True),
                    timeout=self._settings.rabbitmq_publish_confirm_timeout_seconds,
                )
            except TimeoutError as error:
                raise RabbitMqPublishTimeout(event_type, str(event["id"])) from error
            if not isinstance(confirmation, commands.Basic.Ack):
                raise RabbitMqPublishRejected(
                    f"RabbitMQ did not confirm {event_type}: {confirmation!r}"
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
                job_id = str(payload["job_id"])
            except (json.JSONDecodeError, KeyError, TypeError, UnicodeDecodeError):
                await message.reject(requeue=False)
                return

            try:
                await handler(job_id, bool(message.redelivered), message)
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

    async def consume_status(self, handler: StatusHandler) -> None:
        """Create an API-instance queue and fan status events into the hub."""

        channel = await self.connection.channel()
        exchange = await channel.declare_exchange(
            self._settings.rabbitmq_status_exchange,
            ExchangeType.TOPIC,
            durable=True,
        )
        queue = await channel.declare_queue(exclusive=True, auto_delete=True)
        await queue.bind(exchange, routing_key="job.status_changed")

        async def on_message(message: IncomingMessage) -> None:
            async with message.process(ignore_processed=True):
                try:
                    payload = json.loads(message.body)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    await message.reject(requeue=False)
                    return
                await handler(payload)

        await queue.consume(on_message)

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
        await queue.bind(exchange, routing_key="ocr")
        return queue


def _status_payload(event: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "event_type": "job.status_changed",
        "job_id": str(event["job_id"]),
        "document_id": str(event["document_id"]),
        "sequence": int(event["sequence"]),
        "status": event.get("status"),
        "step": event.get("step"),
        "progress": event.get("progress"),
        "processed_pages": event.get("processed_pages"),
        "total_pages": event.get("total_pages"),
        "attempts": event.get("attempts"),
        "max_attempts": event.get("max_attempts"),
        "error": event.get("error"),
        "updated_at": str(event.get("job_updated_at") or event.get("created_at")),
    }
