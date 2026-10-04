"""HTTP contracts for the documents resource."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.document import Cohort, ProgramScope
from app.api.v1.schemas.jobs import JobStatusResponse


class DocumentUploadAcceptedResponse(BaseModel):
    """Identity returned after a durable OCR job has been queued."""

    document_id: str
    job_id: str
    status: str = "processing"


class ConfirmAcceptedResponse(BaseModel):
    document_id: str
    job_id: str


class ConfirmRequest(BaseModel):
    expected_revision: int = Field(ge=1)
    metadata: "ReviewMetadataRequest"
    page_edits: list["ReviewPageUpdateRequest"] = Field(default_factory=list, max_length=500)
    selected_pages: list[int] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def page_numbers_are_unique(self) -> "ConfirmRequest":
        edits = [entry.page for entry in self.page_edits]
        if len(edits) != len(set(edits)):
            raise ValueError("page edits must contain unique page numbers")
        if len(self.selected_pages) != len(set(self.selected_pages)):
            raise ValueError("selected pages must contain unique page numbers")
        return self


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


class OcrDraftResponse(BaseModel):
    id: str
    status: str
    revision: int = Field(default=1, ge=1)
    pages: list[OcrPageResponse]


class DocumentResultResponse(BaseModel):
    """Completed OCR output used by the document comparison screen."""

    document_id: str
    process_status: str
    source: SourceSummary
    page_count: int | None = None
    metadata: DocumentMetadataResponse
    ocr_draft: OcrDraftResponse


class ReviewMetadataRequest(BaseModel):
    """Reviewer-controlled metadata; storage and lifecycle fields stay server-owned."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    document_type: str | None = Field(default=None, min_length=1, max_length=120)
    document_number: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    cohort: Cohort | None = None
    program_scope: ProgramScope | None = None
    language: str | None = Field(default=None, min_length=2, max_length=12)


class ReviewPageUpdateRequest(BaseModel):
    page: int = Field(ge=1)
    reviewed_text: str = Field(max_length=500_000)


class ChunkCorrectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    chunk_id: str = Field(pattern=r"^chunk:chunk_[0-9a-f]{32}$")


class ChunkCorrectionOperation(BaseModel):
    input_id: str
    outcome: Literal["pending", "applied", "unchanged", "failed"]
    job: JobStatusResponse
    children: list[JobStatusResponse]
    chunk_child_ids: list[str]


class IndexedChunkResponse(BaseModel):
    id: str
    text: str
    hierarchy: dict[str, Any]
    chunk_index: int
    page_start: int
    page_end: int
    embedding_status: Literal["ok", "stale"]
    updated_at: str
    active_job_id: str | None
    last_embedding_job_id: str | None
    correction: ChunkCorrectionOperation | None


class IndexedPageResponse(BaseModel):
    page: int
    chunks: list[IndexedChunkResponse]


class IndexedChunksResponse(BaseModel):
    document_id: str
    pages: list[IndexedPageResponse]
