"""LM Studio correction output is bounded and transport errors retry once."""

import asyncio

import httpx
import pytest

from app.application.correction import correct_text
from app.config import Settings


class Response:
    def __init__(self, text):
        self.text = text

    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": self.text}}]}


class Client:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = 0

    async def post(self, url, json):
        self.calls += 1
        output = self.outputs.pop(0)
        if isinstance(output, Exception):
            raise output
        return Response(output)


def test_correction_accepts_plausible_output_and_rejects_empty_or_long() -> None:
    settings = Settings(_env_file=None)
    assert asyncio.run(correct_text("Original text", settings, Client(["Corrected text"]))) == "Corrected text"
    assert asyncio.run(correct_text("Original text", settings, Client([""]))) is None
    assert asyncio.run(correct_text("Original text", settings, Client(["very long output " * 20]))) is None


def test_correction_retries_one_transport_error() -> None:
    client = Client([httpx.ConnectError("temporary"), "Corrected text"])
    assert asyncio.run(correct_text("Original text", Settings(_env_file=None), client)) == "Corrected text"
    assert client.calls == 2


def test_correction_has_elapsed_deadline() -> None:
    class Hanging:
        async def post(self, url, json):
            await asyncio.sleep(1)

    with pytest.raises(TimeoutError):
        asyncio.run(correct_text(
            "Original text", Settings(correction_timeout_seconds=0.01, _env_file=None), Hanging()
        ))
