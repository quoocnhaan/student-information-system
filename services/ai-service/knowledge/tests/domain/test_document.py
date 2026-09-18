from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.domain.document import (
    ChunkRecord,
    DocumentProcessStatus,
    DocumentRecord,
    ProgramScopeType,
)


def test_document_accepts_the_configured_schema() -> None:
    document = DocumentRecord.model_validate(
        {
            "id": "document:01JXYZ",
            "title": "Student Academic Regulations 2026",
            "document_type": "regulation",
            "cohort": {"from_year": 2026, "to_year": None},
            "program_scope": {"type": "non_language_major", "programs": []},
            "language": "vi",
            "source": {
                "object_key": "documents/01JXYZ/original.pdf",
                "original_filename": "quy_che_sinh_vien_2026.pdf",
                "mime_type": "application/pdf",
            },
            "process_status": "processing",
            "status": "active",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    )

    assert document.process_status is DocumentProcessStatus.PROCESSING


def test_specific_program_scope_requires_programs() -> None:
    with pytest.raises(ValidationError, match="requires at least one program"):
        DocumentRecord.model_validate(
            {
                "id": "document:01JXYZ",
                "title": "Programme regulation",
                "document_type": "regulation",
                "cohort": {"from_year": 2026},
                "program_scope": {
                    "type": ProgramScopeType.SPECIFIC_PROGRAMS,
                    "programs": [],
                },
                "language": "vi",
                "source": {
                    "object_key": "documents/01JXYZ/original.pdf",
                    "original_filename": "regulation.pdf",
                    "mime_type": "application/pdf",
                },
                "process_status": "processing",
                "status": "active",
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
        )


def test_chunk_requires_a_768_dimension_embedding() -> None:
    with pytest.raises(ValidationError, match="at least 768 items"):
        ChunkRecord.model_validate(
            {
                "id": "chunk:01JDEF",
                "document_id": "document:01JXYZ",
                "ocr_draft_id": "ocr_draft:01JABC",
                "text": "text",
                "embedding_text": "text",
                "embedding": [0.1],
                "position": {"chunk_index": 0, "page_start": 1, "page_end": 1},
                "hierarchy": {},
                "token_count": 1,
                "created_at": datetime.now(UTC),
            }
        )
