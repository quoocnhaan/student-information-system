import asyncio

import httpx
import pytest

from app.config import Settings
from app.worker.index import embed_texts


def test_embedding_rejects_wrong_dimension():
    async def respond(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": [{"index": 0, "embedding": [0.1, 0.2]}]})

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            with pytest.raises(ValueError, match="768-dimensional"):
                await embed_texts(["text"], Settings(_env_file=None), client)

    asyncio.run(run())
