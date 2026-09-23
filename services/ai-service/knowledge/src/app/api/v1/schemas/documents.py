"""HTTP contracts for the documents resource."""

from typing import Any

from pydantic import BaseModel


class DocumentUploadAcceptedResponse(BaseModel):
    """Identity returned after a durable OCR job has been queued."""

    document_id: str
    job_id: str
    status: str = "processing"


class SourceSummary(BaseModel):
    """Safe source fields exposed to the review UI."""

    original_filename: str
    mime_type: str


class DocumentMetadataResponse(BaseModel):
    """OCR-detected document metadata, pending human review."""

    title: str | None = None
    document_type: str | None = None
    document_number: str | None = None
    description: str | None = None
    cohort: dict[str, Any] | None = None
    program_scope: dict[str, Any] | None = None
    language: str | None = None


class OcrPageResponse(BaseModel):
    page: int
    raw_text: str
    reviewed_text: str | None = None


class OcrDraftResponse(BaseModel):
    id: str
    status: str
    pages: list[OcrPageResponse]


class DocumentResultResponse(BaseModel):
    """Completed OCR output used by the document comparison screen."""

    document_id: str
    process_status: str
    source: SourceSummary
    page_count: int | None = None
    metadata: DocumentMetadataResponse
    ocr_draft: OcrDraftResponse
