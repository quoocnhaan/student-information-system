"""HTTP contracts for durable ingestion jobs."""

from pydantic import BaseModel


class JobStatusResponse(BaseModel):
    """UI-facing status for a document ingestion job."""

    id: str
    type: str
    document_id: str
    followup_job_ids: list[str]
    status: str
    step: str
    progress: int
    version: int = 1
    updated_at: str | None = None
    error: str | None = None
    retry_available: bool = False
