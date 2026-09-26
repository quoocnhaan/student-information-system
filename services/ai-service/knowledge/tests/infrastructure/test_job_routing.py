"""All durable jobs share one queue; the database owns their job type."""

import asyncio
import json
from types import SimpleNamespace

from pamqp import commands

from app.config import Settings
from app.infrastructure.rabbitmq import RabbitMqBroker


class _Queue:
    def __init__(self, name: str) -> None:
        self.name = name
        self.bindings: list[str] = []
        self.declaration_result = SimpleNamespace(message_count=0)
        self.on_message = None
        self.cancelled: list[str] = []

    async def bind(self, _exchange, routing_key: str) -> None:
        self.bindings.append(routing_key)

    async def consume(self, handler):
        self.on_message = handler
        return f"consumer-{self.name}"

    async def cancel(self, tag: str) -> None:
        self.cancelled.append(tag)


class _Exchange:
    def __init__(self) -> None:
        self.published: list[tuple[object, str, bool]] = []

    async def publish(self, message, routing_key: str, mandatory: bool):
        self.published.append((message, routing_key, mandatory))
        return commands.Basic.Ack()


class _Channel:
    def __init__(self) -> None:
        self.exchange = _Exchange()
        self.queues: dict[str, _Queue] = {}
        self.closed = False

    async def declare_exchange(self, *_args, **_kwargs):
        return self.exchange

    async def declare_queue(self, name: str, **_kwargs):
        return self.queues.setdefault(name, _Queue(name))

    async def set_qos(self, **_kwargs) -> None:
        pass

    async def close(self) -> None:
        self.closed = True


class _Connection:
    def __init__(self, channel: _Channel) -> None:
        self._channel = channel

    async def channel(self, **_kwargs):
        return self._channel


def test_two_jobs_publish_to_one_durable_queue_without_job_type() -> None:
    async def scenario() -> None:
        channel = _Channel()
        broker = RabbitMqBroker(Settings())
        broker._connection = _Connection(channel)  # type: ignore[assignment]

        for suffix in ("first", "second"):
            await broker.publish_job_trigger(f"job:job_{suffix}", 2)

        assert set(channel.queues) == {"knowledge.jobs.ocr"}
        assert set(channel.queues["knowledge.jobs.ocr"].bindings) == {
            "job.queued", "ocr",
        }
        assert [key for _message, key, _mandatory in channel.exchange.published] == [
            "job.queued", "job.queued",
        ]
        assert all(mandatory for _message, _key, mandatory in channel.exchange.published)
        assert json.loads(channel.exchange.published[1][0].body) == {
            "job_id": "job:job_second",
            "dispatch_generation": 2,
        }
        assert channel.closed is True

    asyncio.run(scenario())


class _Incoming:
    def __init__(self, payload: dict[str, object]) -> None:
        self.body = json.dumps(payload).encode("utf-8")
        self.redelivered = False
        self.processed = False
        self.rejected = False

    async def reject(self, requeue: bool) -> None:
        assert requeue is False
        self.rejected = True
        self.processed = True


def test_one_consumer_delivers_job_identity_and_generation() -> None:
    async def scenario() -> None:
        channel = _Channel()
        broker = RabbitMqBroker(Settings())
        broker._connection = _Connection(channel)  # type: ignore[assignment]
        received: list[tuple[str, int]] = []

        async def handler(job_id, generation, _redelivered, _message):
            received.append((job_id, generation))

        await broker.consume_jobs(handler)
        queue = channel.queues["knowledge.jobs.ocr"]
        await queue.on_message(_Incoming({
            "job_id": "job:job_a", "dispatch_generation": 2,
        }))
        invalid = _Incoming({
            "job_id": "job:job_b", "dispatch_generation": 0,
        })
        await queue.on_message(invalid)

        assert received == [("job:job_a", 2)]
        assert invalid.rejected is True
        await broker.stop_consuming_jobs()
        assert queue.cancelled == ["consumer-knowledge.jobs.ocr"]

    asyncio.run(scenario())


def test_legacy_delivery_job_type_is_ignored() -> None:
    async def scenario() -> None:
        channel = _Channel()
        broker = RabbitMqBroker(Settings())
        broker._connection = _Connection(channel)  # type: ignore[assignment]
        received: list[tuple[str, int]] = []

        async def handler(job_id, generation, _redelivered, _message):
            received.append((job_id, generation))

        await broker.consume_jobs(handler)
        queue = channel.queues["knowledge.jobs.ocr"]
        await queue.on_message(_Incoming({
            "job_id": "job:job_old", "job_type": "ocr", "dispatch_generation": 1,
        }))

        assert received == [("job:job_old", 1)]
        await broker.stop_consuming_jobs()

    asyncio.run(scenario())
