from pathlib import Path


def test_schema_configures_the_documented_vector_index() -> None:
    schema = (Path(__file__).parents[2] / "db" / "schema.surql").read_text(
        encoding="utf-8"
    )

    assert "DEFINE TABLE IF NOT EXISTS document SCHEMAFULL" in schema
    assert "DEFINE TABLE IF NOT EXISTS ocr_draft SCHEMAFULL" in schema
    assert "DEFINE TABLE IF NOT EXISTS chunk SCHEMAFULL" in schema
    assert "HNSW DIMENSION 768 DIST COSINE TYPE F32" in schema


def test_schema_creates_durable_sequenced_outbox_events() -> None:
    schema = (Path(__file__).parents[2] / "db" / "schema.surql").read_text(
        encoding="utf-8"
    )

    assert "DEFINE TABLE IF NOT EXISTS outbox_event SCHEMAFULL" in schema
    assert "DEFINE EVENT OVERWRITE job_status_outbox" in schema
    assert "DEFINE EVENT OVERWRITE job_dispatch_outbox" in schema
    assert "sequence = $after.sequence" in schema
    assert "available_at = $after.next_attempt_at" in schema


def test_schema_versions_review_drafts() -> None:
    schema = (Path(__file__).parents[2] / "db" / "schema.surql").read_text(
        encoding="utf-8"
    )

    assert "DEFINE FIELD IF NOT EXISTS revision ON TABLE ocr_draft TYPE int DEFAULT 1" in schema
    assert "UPDATE ocr_draft SET revision = 1 WHERE revision IS NONE;" in schema
