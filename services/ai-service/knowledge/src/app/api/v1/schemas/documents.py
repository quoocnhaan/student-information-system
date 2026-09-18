"""HTTP contracts for the documents resource."""

from pydantic import BaseModel


class DocumentUploadAcceptedResponse(BaseModel):
    """Identity returned after a durable OCR job has been queued."""

    document_id: str
    job_id: str
    status: str = "processing"
