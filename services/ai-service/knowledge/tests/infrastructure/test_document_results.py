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


class _ReviewUpdateClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any] | None]] = []

    async def query(
        self, query: str, variables: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        self.calls.append((query, variables))
        if query.startswith("SELECT * FROM document:"):
            return [{"id": "document:doc_a", "process_status": "review"}]
        if "type::record('document', $record_id)" in query:
            return [{
                "id": "ocr_draft:ocr_job_a",
                "status": "draft",
                "revision": 1,
                "pages": [{"page": 1, "raw_text": "Original", "reviewed_text": None}],
            }]
        return []


def test_review_save_preserves_raw_ocr_and_uses_a_revision_transaction() -> None:
    client = _ReviewUpdateClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    saved = asyncio.run(database.update_document_review(
        "doc_a",
        expected_revision=1,
        metadata={"title": "Corrected"},
        page_updates=[{"page": 1, "reviewed_text": "# Reviewed"}],
    ))

    assert saved is True
    query, variables = client.calls[-1]
    assert query.startswith("BEGIN TRANSACTION;")
    assert "WHERE revision = $expected_revision" in query
    assert "revision += 1" in query
    assert variables == {
        "pages": [{"page": 1, "raw_text": "Original", "reviewed_text": "# Reviewed"}],
        "metadata": {"title": "Corrected"},
        "expected_revision": 1,
    }
