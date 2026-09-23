"""Regression tests for the document-to-OCR-draft read model."""

import asyncio
from typing import Any

from app.infrastructure.surreal import SurrealDatabase


class _ResultClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any] | None]] = []

    async def query(
        self, query: str, variables: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        self.calls.append((query, variables))
        if query.startswith("SELECT * FROM document:"):
            return [{"id": "document:doc_a", "process_status": "review"}]
        if "type::record('document', $record_id)" in query:
            return [{"id": "ocr_draft:ocr_job_a", "status": "draft"}]
        return []


def test_document_result_compares_the_typed_document_record() -> None:
    client = _ResultClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    result = asyncio.run(database.get_document_result("doc_a"))

    assert result is not None
    document, draft = result
    assert document["process_status"] == "review"
    assert draft == {"id": "ocr_draft:ocr_job_a", "status": "draft"}
    query, variables = client.calls[-1]
    assert "type::record('document', $record_id)" in query
    assert variables == {"record_id": "doc_a"}
