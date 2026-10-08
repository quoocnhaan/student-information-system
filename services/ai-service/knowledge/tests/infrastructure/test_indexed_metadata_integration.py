"""Metadata edits against a fresh isolated target schema."""
import asyncio
import os
from uuid import uuid4

import pytest
from app.infrastructure.surreal import SurrealDatabase
from test_stalled_jobs_integration import isolated, index_job

pytestmark = pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_SURREAL_URL"), reason="No isolated database")

async def indexed(database):
    job, document, chunks = await index_job(database)
    attempt = uuid4().hex
    await database.claim_job(job, attempt, "index_document")
    await database.complete_index_job(job, attempt, chunks, "mock")
    return document


def test_metadata_roundtrip_clearing_and_conflict_preserve_indexed_content():
    async def run():
        async with isolated() as (database, _):
            document_id = await indexed(database)
            document, before = await database.indexed_document(document_id)
            jobs_before = await database.client.query("SELECT * FROM job;")
            metadata = dict(title="New title", document_type="Policy", document_number="42", description="Description",
                            language="en", cohort={"from_year": 2025, "to_year": None}, program_scope={"type": "specific_programs", "programs": ["english"]})
            saved = await database.update_indexed_metadata(document_id, document["metadata_version"], metadata)
            assert saved and saved["title"] == "New title"
            assert saved["metadata_version"] != document["metadata_version"]
            assert saved["cohort"]["from_year"] == 2025
            assert await database.update_indexed_metadata(document_id, document["metadata_version"], metadata) is None
            library = await database.list_indexed_documents(q="New title")
            assert library["total"] == 1 and library["document_types"] == ["Policy"]
            cleared = await database.update_indexed_metadata(document_id, saved["metadata_version"], {key: None for key in metadata})
            assert cleared and all(not cleared.get(key) for key in metadata)
            current, after = await database.indexed_document(document_id)
            assert current["created_at"] == document["created_at"]
            assert current["source"] == document["source"]
            assert before == after
            assert await database.client.query("SELECT * FROM job;") == jobs_before
    asyncio.run(run())


def test_competing_metadata_saves_allow_only_one_commit():
    async def run():
        async with isolated() as (database, settings):
            document_id = await indexed(database)
            document, _ = await database.indexed_document(document_id)
            competitor = SurrealDatabase(settings)
            await competitor.connect()
            try:
                values = dict(title="First", document_type=None, document_number=None, description=None, language=None, cohort=None, program_scope=None)
                results = await asyncio.gather(database.update_indexed_metadata(document_id, document["metadata_version"], values),
                    competitor.update_indexed_metadata(document_id, document["metadata_version"], {**values, "title": "Second"}))
                assert len([row for row in results if row is not None]) == 1
            finally:
                await competitor.close()
    asyncio.run(run())
