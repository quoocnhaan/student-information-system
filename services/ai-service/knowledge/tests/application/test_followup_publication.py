import asyncio
from unittest.mock import AsyncMock

from app.worker.__main__ import publish_followups


def test_publication_failure_does_not_skip_later_children():
    publisher = AsyncMock()
    publisher.publish.side_effect = [RuntimeError("Broker disconnected"), None, None]
    rows = [{"id": f"job:child_{i}"} for i in range(3)]
    asyncio.run(publish_followups(publisher, rows))
    assert [call.args[0] for call in publisher.publish.await_args_list] == rows
