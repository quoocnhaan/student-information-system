"""Publisher confirmations must have a bounded application deadline."""

import asyncio

import pytest

from app.config import Settings
from app.infrastructure.rabbitmq import RabbitMqBroker, RabbitMqPublishTimeout


class _Exchange:
    async def publish(self, *_args, **_kwargs):
        await asyncio.Event().wait()


class _Channel:
    def __init__(self) -> None:
        self.closed = False

    async def declare_exchange(self, *_args, **_kwargs):
        return _Exchange()

    async def declare_queue(self, *_args, **_kwargs):
        return _Queue()

    async def close(self) -> None:
        self.closed = True


class _Queue:
    async def bind(self, *_args, **_kwargs) -> None:
        pass


class _Connection:
    def __init__(self, channel: _Channel) -> None:
        self._channel = channel

    async def channel(self, **_kwargs):
        return self._channel


def test_publish_confirmation_timeout_is_bounded_and_closes_channel() -> None:
    async def scenario() -> None:
        channel = _Channel()
        broker = RabbitMqBroker(Settings(rabbitmq_publish_confirm_timeout_seconds=0.01))
        broker._connection = _Connection(channel)  # type: ignore[assignment]

        with pytest.raises(RabbitMqPublishTimeout, match="job.queued.*job_a"):
            await broker.publish_job_trigger("job:job_a", 1)
        assert channel.closed is True

    asyncio.run(scenario())
