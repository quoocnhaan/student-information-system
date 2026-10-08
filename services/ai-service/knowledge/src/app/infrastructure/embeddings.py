"""Shared embedding transport, task prefixes and vector invariants."""

import asyncio
import math
from typing import Literal

import httpx
from app.config import Settings

DIMENSIONS = 768


def embedding_profile(model: str) -> str:
    return "nomic-search-v1" if "nomic-embed-text" in model.lower() else "plain-v1"


def validate_vector(vector: object) -> list[float]:
    if not isinstance(vector, list) or len(vector) != DIMENSIONS:
        raise ValueError("Embedding must be a 768-dimensional vector of finite numbers")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for value in vector):
        raise ValueError("Embedding must contain 768 finite numbers")
    norm = math.hypot(*vector)
    if norm == 0 or not math.isfinite(norm):
        raise ValueError("Embedding must have a finite nonzero norm")
    return vector


async def embed_texts(texts: list[str], settings: Settings, client: httpx.AsyncClient | None = None,
                     *, purpose: Literal["document", "query"] = "document") -> list[list[float]]:
    inputs = texts
    if embedding_profile(settings.lmstudio_embedding_model) == "nomic-search-v1":
        inputs = [f"search_{purpose}: {text}" for text in texts]
    owned_client = client is None
    client = client or httpx.AsyncClient(timeout=settings.embedding_timeout_seconds)
    try:
        async with asyncio.timeout(settings.embedding_timeout_seconds):
            response = await client.post(settings.lmstudio_base_url.rstrip("/") + "/embeddings", json={
                "model": settings.lmstudio_embedding_model, "input": inputs,
            })
            response.raise_for_status()
            entries = response.json()["data"]
            if sorted(entry["index"] for entry in entries) != list(range(len(texts))):
                raise ValueError("Embedding response indexes must match inputs exactly")
            return [validate_vector(entry["embedding"]) for entry in sorted(entries, key=lambda item: item["index"])]
    finally:
        if owned_client:
            await client.aclose()
