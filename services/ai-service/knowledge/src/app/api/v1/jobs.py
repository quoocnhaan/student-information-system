"""UI polling endpoints for durable document-ingestion jobs."""

from typing import Any, Mapping

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.schemas.jobs import JobStatusResponse
from app.dependencies import get_database
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str, database: SurrealDatabase = Depends(get_database)
) -> JobStatusResponse:
    """Return job step and progress so the UI can render ingestion status."""

    record_id = job_id.removeprefix("job:")
    try:
        job = await database.get_job(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Job status is unavailable",
        ) from error
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _as_response(job)


def _as_response(job: Mapping[str, Any]) -> JobStatusResponse:
    return JobStatusResponse(
        id=str(job["id"]),
        type=job["type"],
        document_id=str(job["document_id"]),
        ocr_draft_id=(
            str(job["ocr_draft_id"]) if job.get("ocr_draft_id") is not None else None
        ),
        status=job["status"],
        step=job["step"],
        progress=job["progress"],
        total_pages=job.get("total_pages"),
        processed_pages=job["processed_pages"],
        error=job.get("error"),
        attempts=job.get("attempts", 0),
        max_attempts=job.get("max_attempts", 3),
        next_attempt_at=(
            str(job["next_attempt_at"])
            if job.get("next_attempt_at") is not None
            else None
        ),
    )
