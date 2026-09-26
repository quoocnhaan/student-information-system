import asyncio
from pathlib import Path

import pytest

from app.config import Settings
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError


def test_schema_script_reports_a_later_statement_failure() -> None:
    class Client:
        async def query_raw(self, _script):
            return {"result": [
                {"status": "OK", "result": None},
                {"status": "ERR", "result": "missing required field"},
            ]}

    database = SurrealDatabase(Settings())
    database._client = Client()
    with pytest.raises(SurrealDatabaseError, match="statement 2 failed"):
        asyncio.run(database.execute_script("DEFINE TABLE job; UPDATE job;"))


def test_schema_configures_the_documented_vector_index() -> None:
    schema = (Path(__file__).parents[2] / "db" / "schema.surql").read_text(
        encoding="utf-8"
    )

    assert "DEFINE TABLE IF NOT EXISTS document SCHEMAFULL" in schema
    assert "DEFINE TABLE IF NOT EXISTS ocr_draft SCHEMAFULL" in schema
    assert "DEFINE TABLE IF NOT EXISTS chunk SCHEMAFULL" in schema
    assert "HNSW DIMENSION 768 DIST COSINE TYPE F32" in schema


def test_schema_keeps_dispatch_state_on_jobs() -> None:
    schema = (Path(__file__).parents[2] / "db" / "schema.surql").read_text(
        encoding="utf-8"
    )

    assert "dispatch_published_at ON TABLE job" in schema
    assert "dispatch_publish_attempts ON TABLE job" in schema
    assert "dispatch_lease_owner ON TABLE job" in schema
    assert "job_dispatch_due ON TABLE job" in schema
    assert "DEFINE TABLE IF NOT EXISTS outbox_event" not in schema


def test_schema_versions_review_drafts() -> None:
    schema = (Path(__file__).parents[2] / "db" / "schema.surql").read_text(
        encoding="utf-8"
    )

    assert "DEFINE FIELD IF NOT EXISTS revision ON TABLE ocr_draft TYPE int DEFAULT 1" in schema
    assert "UPDATE ocr_draft SET revision = 1 WHERE revision IS NONE;" in schema
