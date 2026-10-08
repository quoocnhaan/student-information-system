"""Embed reviewed chunks and atomically publish the index."""

import asyncio
from collections.abc import Mapping

import httpx

from app.application.chunking import chunk_pages
from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase


async def embed_texts(texts: list[str], settings: Settings, client: httpx.AsyncClient | None = None) -> list[list[float]]:
    owned_client = client is None
    client = client or httpx.AsyncClient(timeout=settings.embedding_timeout_seconds)
    try:
        async with asyncio.timeout(settings.embedding_timeout_seconds):
            response = await client.post(settings.lmstudio_base_url.rstrip("/") + "/embeddings", json={
                "model": settings.lmstudio_embedding_model, "input": texts,
            })
            response.raise_for_status()
            vectors = [entry["embedding"] for entry in sorted(response.json()["data"], key=lambda item: item["index"])]
            if len(vectors) != len(texts) or any(len(vector) != 768 for vector in vectors):
                raise ValueError("Embedding response must contain one 768-dimensional vector per chunk")
            return vectors
    finally:
        if owned_client:
            await client.aclose()


class IndexDocumentHandler:
    type = "index_document"
    version = 1

    def __init__(self, settings: Settings, database: SurrealDatabase) -> None:
        self.settings = settings
        self.database = database

    async def process(self, job_id: str, attempt_id: str, claimed: Mapping) -> None:
        index_input = await self.database.get_index_input_for_job(job_id)
        if index_input is None or not isinstance(index_input.get("pages"), list):
            raise ValueError("Confirmed index input is missing")
        chunks = chunk_pages(index_input["pages"])
        if not chunks:
            raise ValueError("Confirmed review contains no indexable text")
        batch_size = self.settings.embedding_batch_size
        for start in range(0, len(chunks), batch_size):
            batch = chunks[start:start + batch_size]
            vectors = await embed_texts([chunk["embedding_text"] for chunk in batch], self.settings)
            for chunk, vector in zip(batch, vectors):
                chunk["embedding"] = vector
            await self.database.job_progress(job_id, attempt_id, {
                "step": "embedding", "progress": 10 + round(min(start + batch_size, len(chunks)) / len(chunks) * 80),
            })
        completed = await self.database.complete_index_job(job_id, attempt_id, chunks, self.settings.lmstudio_embedding_model)
        if completed is None:
            raise RuntimeError("Index claim is no longer active")

    async def on_failure(self, job_id: str, attempt_id: str, claimed: Mapping, error: str) -> None:
        await self.database.fail_index_job(job_id, attempt_id, error)


class ReembedChunkHandler:
    type = "reembed_chunk"
    version = 1

    def __init__(self, settings: Settings, database: SurrealDatabase) -> None:
        self.settings = settings
        self.database = database

    async def process(self, job_id: str, attempt_id: str, claimed: Mapping) -> None:
        text = str(claimed["payload"].get("embedding_text") or "")
        if not text:
            raise ValueError("Captured embedding input is missing")
        if claimed["payload"].get("embedding_version") is None:
            raise ValueError("Captured embedding version is missing")
        vector = (await embed_texts([text], self.settings))[0]
        if await self.database.complete_reembed_job(job_id, attempt_id, text, vector) is None:
            raise RuntimeError("Re-embedding claim is no longer active")

    async def on_failure(self, job_id: str, attempt_id: str, claimed: Mapping, error: str) -> None:
        await self.database.fail_reembed_job(job_id, attempt_id, error)
