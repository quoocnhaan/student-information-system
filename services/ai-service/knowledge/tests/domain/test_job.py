import pytest
from pydantic import ValidationError
from surrealdb import RecordID

from app.domain.job import validate_payload


@pytest.mark.parametrize("job_type,payload", [
    ("ocr_pdf", {}),
    ("index_document", {"index_input_id": RecordID("index_input", "index_input_" + "a" * 32), "confirmation_fingerprint": "b" * 64}),
    ("correct_chunks", {"chunk_id": "chunk:chunk_" + "c" * 32, "base_text": "Original", "embedding_text": "Original", "embedding_version": 1, "embedding_status": "ok", "hierarchy": {}}),
    ("reembed_chunk", {"chunk_id": "chunk:chunk_" + "c" * 32, "embedding_text": "Captured", "embedding_version": 1}),
])
def test_payloads_validate_and_are_frozen(job_type, payload):
    model = validate_payload(job_type, payload)
    with pytest.raises(ValidationError):
        model.unknown = "mutation"


@pytest.mark.parametrize("job_type,payload", [
    ("correct_ocr", {}),
    ("ocr_pdf", None),
    ("ocr_pdf", {"chunk_id": "unexpected"}),
    ("index_document", {}),
    ("correct_chunks", {"chunk_ids": ["chunk:chunk_" + "a" * 32]}),
    ("reembed_chunk", {"chunk_id": "chunk:chunk_" + "a" * 32, "embedding_text": "x", "embedding_version": True}),
    ("reembed_chunk", {"chunk_id": "chunk:chunk_" + "a" * 32, "embedding_text": "", "embedding_version": 0}),
])
def test_payloads_reject_removed_types_unknown_fields_and_invalid_inputs(job_type, payload):
    with pytest.raises(ValueError):
        validate_payload(job_type, payload)


@pytest.mark.parametrize("field", ["chunk_id", "base_text", "embedding_text", "embedding_version", "embedding_status", "hierarchy"])
def test_correction_requires_every_snapshot_field(field):
    payload = dict(chunk_id=RecordID("chunk", "chunk_" + "a" * 32), base_text="Captured", embedding_text="Captured", embedding_version=1, embedding_status="ok", hierarchy={})
    del payload[field]
    with pytest.raises(ValueError): validate_payload("correct_chunks", payload)


@pytest.mark.parametrize("result", [{}, {"outcome": "pending", "proposed_text": None}, {"outcome": "applied"}, {"outcome": "failed", "proposed_text": 123}, {"outcome": "applied", "proposed_text": "text", "extra": True}])
def test_correction_results_reject_incomplete_and_malformed_values(result):
    from app.domain.job import CorrectionResult
    with pytest.raises(ValueError): CorrectionResult.model_validate(result)
