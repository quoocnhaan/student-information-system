"""Document ingestion endpoints."""

from io import BytesIO
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.v1.schemas.documents import DocumentUploadAcceptedResponse
from app.config import Settings, get_settings
from app.dependencies import get_database, get_object_store
from app.infrastructure.minio import MinioObjectStore, ObjectStoreError
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError


router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "",
    response_model=DocumentUploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_pdf(
    file: Annotated[UploadFile, File(description="PDF source document")],
    database: SurrealDatabase = Depends(get_database),
    object_store: MinioObjectStore = Depends(get_object_store),
    settings: Settings = Depends(get_settings),
) -> DocumentUploadAcceptedResponse:
    """Persist a PDF and return a durable OCR job for UI progress polling."""

    signature = await file.read(5)
    if signature != b"%PDF-":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="file must be a PDF",
        )

    await file.seek(0)
    pdf_data = await file.read()
    size = len(pdf_data)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="file must not be empty",
        )

    # The service limit protects memory/disk use during multipart parsing.
    if size > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                "file exceeds the "
                f"{settings.max_upload_bytes // (1024 * 1024)} MiB limit"
            ),
        )

    record_id = f"doc_{uuid4().hex}"
    job_record_id = f"job_{uuid4().hex}"
    document_id = f"document:{record_id}"
    job_id = f"job:{job_record_id}"
    object_key = f"documents/{record_id}/original.pdf"
    filename = Path(file.filename or "document.pdf").name
    document = {
        "source": {
            "object_key": object_key,
            "original_filename": filename,
            "mime_type": "application/pdf",
        },
        "process_status": "processing",
        "status": "active",
    }

    try:
        await object_store.put_pdf(object_key, BytesIO(pdf_data), size)
    except ObjectStoreError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="PDF storage is unavailable",
        ) from error

    try:
        await database.create_document(record_id, document)
        await database.create_job(job_record_id, record_id, job_type="ocr")
    except SurrealDatabaseError as error:
        try:
            await object_store.remove(object_key)
        except ObjectStoreError:
            pass
        try:
            await database.delete_document(record_id)
        except SurrealDatabaseError:
            pass
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata could not be saved",
        ) from error

    return DocumentUploadAcceptedResponse(document_id=document_id, job_id=job_id)
