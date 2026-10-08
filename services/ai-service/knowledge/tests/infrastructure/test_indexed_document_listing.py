"""Query binding and optional real-database library behavior."""

import asyncio
import os
from uuid import uuid4

import pytest

from app.infrastructure.surreal import SurrealDatabase


def test_search_and_filter_values_are_bound_not_interpolated():
    class Client:
        def __init__(self):
            self.calls = []

        async def query(self, query, variables=None):
            self.calls.append((query, variables))
            return []

    database = object.__new__(SurrealDatabase)
    client = Client()
    database._client = client
    result = asyncio.run(database.list_indexed_documents(
        q="' OR true", document_type="Policy", language="en", page=3, page_size=10,
    ))
    assert result["items"] == [] and result["total"] == 0
    for query, variables in client.calls[:2]:
        assert "' OR true" not in query
        assert variables["search"] == "' or true"
        assert variables["offset"] == 20
        assert "process_status = 'indexed'" in query
        assert "document_type = $document_type" in query
        assert "language = $language" in query


@pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No isolated database")
def test_library_filters_counts_and_paginates_persisted_documents():
    from test_stalled_jobs_integration import isolated

    async def run():
        async with isolated() as (database, _):
            for index, state in enumerate(["indexed", "indexed", "review"]):
                await database.create_document(f"doc_{uuid4().hex}", {
                    "source": {"object_key": f"test/{index}.pdf", "original_filename": f"rules-{index}.pdf", "mime_type": "application/pdf"},
                    "title": "Rules" if index == 0 else "Guide",
                    "document_type": "Policy" if index == 0 else "Guide",
                    "language": "en" if index == 0 else "th",
                    "document_number": "R-2026", "process_status": state, "status": "active",
                })
            first = await database.list_indexed_documents(page_size=1)
            second = await database.list_indexed_documents(page=2, page_size=1)
            assert first["total"] == second["total"] == 2
            assert first["items"][0]["document_id"] != second["items"][0]["document_id"]
            assert first["document_types"] == ["Guide", "Policy"]
            assert first["languages"] == ["en", "th"]
            filtered = await database.list_indexed_documents(q="RULES", document_type="Policy", language="en")
            assert filtered["total"] == 1
            assert filtered["items"][0]["title"] == "Rules"
            assert filtered["document_types"] == ["Guide", "Policy"]
            assert (await database.list_indexed_documents(q="R-2026"))["total"] == 2
            assert (await database.list_indexed_documents(q="no match"))["total"] == 0
    asyncio.run(run())
