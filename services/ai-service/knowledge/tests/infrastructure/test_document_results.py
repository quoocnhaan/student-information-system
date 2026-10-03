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
        if query.startswith("SELECT * FROM ocr_draft"):
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


class _ConfirmationClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any] | None]] = []

    async def query(
        self, query: str, variables: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        self.calls.append((query, variables))
        if query.startswith("SELECT * FROM document:"):
            return [{"id": "document:doc_a", "process_status": "review"}]
        if query.startswith("SELECT * FROM ocr_draft"):
            return [{
                "id": "ocr_draft:ocr_job_a",
                "status": "draft",
                "revision": 1,
                "pages": [{"page": 1, "raw_text": "Original", "reviewed_text": None}],
            }]
        if query.startswith("SELECT * FROM job:"):
            return [{"id": "job:job_" + "a" * 32, "status": "queued"}]
        return []


def test_confirmation_creates_an_immutable_index_input_in_a_transaction() -> None:
    client = _ConfirmationClient()
    database = object.__new__(SurrealDatabase)
    database._client = client

    confirmed = asyncio.run(database.confirm_review(
        "doc_" + "a" * 32,
        1, {"title": "Corrected"}, [{"page": 1, "reviewed_text": "# Reviewed"}], [1],
    ))

    assert confirmed is not None
    query, variables = client.calls[-2]
    assert query.startswith("BEGIN TRANSACTION;")
    assert "CREATE index_input:" in query
    assert "confirmation_fingerprint" in query
    assert variables["pages"] == [{"page": 1, "text": "# Reviewed"}]
