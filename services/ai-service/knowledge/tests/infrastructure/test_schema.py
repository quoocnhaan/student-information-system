from pathlib import Path


def test_schema_configures_the_documented_vector_index() -> None:
    schema = (Path(__file__).parents[2] / "db" / "schema.surql").read_text(
        encoding="utf-8"
    )

    assert "DEFINE TABLE IF NOT EXISTS document SCHEMAFULL" in schema
    assert "DEFINE TABLE IF NOT EXISTS ocr_draft SCHEMAFULL" in schema
    assert "DEFINE TABLE IF NOT EXISTS chunk SCHEMAFULL" in schema
    assert "HNSW DIMENSION 768 DIST COSINE TYPE F32" in schema
