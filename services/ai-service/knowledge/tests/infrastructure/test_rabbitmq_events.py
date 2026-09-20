"""Tests for the stable internal status-event contract."""

from app.infrastructure.rabbitmq import _status_payload


def test_status_payload_contains_sequence_and_no_document_content() -> None:
    payload = _status_payload(
        {
            "job_id": "job:job_a",
            "document_id": "document:doc_a",
            "sequence": 12,
            "status": "running",
            "step": "ocr",
            "progress": 45,
            "processed_pages": 3,
            "total_pages": 8,
            "attempts": 1,
            "max_attempts": 3,
            "error": None,
            "job_updated_at": "2026-09-21T10:00:00Z",
        }
    )

    assert payload["event_type"] == "job.status_changed"
    assert payload["sequence"] == 12
    assert payload["updated_at"] == "2026-09-21T10:00:00Z"
    assert "pages" not in payload
    assert "raw_text" not in payload
