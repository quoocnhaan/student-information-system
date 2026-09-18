"""HTTP contracts for durable ingestion jobs."""

from pydantic import BaseModel


class JobStatusResponse(BaseModel):
    """UI-facing status for a document ingestion job."""

    id: str
    type: str
    document_id: str
    ocr_draft_id: str | None = None
    status: str
    step: str
    progress: int
    total_pages: int | None = None
    processed_pages: int
    error: str | None = None
    attempts: int = 0
    max_attempts: int = 3
    next_attempt_at: str | None = None
