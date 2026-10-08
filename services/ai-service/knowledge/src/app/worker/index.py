"""Embed reviewed chunks and atomically publish the index."""

from collections.abc import Mapping

from app.application.chunking import chunk_pages
from app.config import Settings
from app.infrastructure.embeddings import embedding_profile, embed_texts
from app.infrastructure.surreal import SurrealDatabase


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
        document = await self.database.get_document(str(claimed["document_id"]).split(":")[-1])
        if document is None or document.get("embedding_model") != self.settings.lmstudio_embedding_model or document.get("embedding_profile") != embedding_profile(self.settings.lmstudio_embedding_model):
            raise ValueError("Document embedding model or task profile differs; re-index the document before re-embedding a chunk")
        vector = (await embed_texts([text], self.settings))[0]
        if await self.database.complete_reembed_job(job_id, attempt_id, text, vector) is None:
            raise RuntimeError("Re-embedding claim is no longer active")

    async def on_failure(self, job_id: str, attempt_id: str, claimed: Mapping, error: str) -> None:
        await self.database.fail_reembed_job(job_id, attempt_id, error)
