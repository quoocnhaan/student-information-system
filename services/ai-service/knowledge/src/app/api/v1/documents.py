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
from app.infrastructure.rabbitmq import RabbitMqBroker
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError
from app.observability.logging import get_logger
from app.observability.metrics import OUTBOX_PUBLISHES
from app.outbox import _publish_result

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "",
    response_model=DocumentUploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_pdf(
    file: Annotated[UploadFile, File(description="PDF source document")],
    database: Annotated[SurrealDatabase, Depends(get_database)],
    object_store: Annotated[MinioObjectStore, Depends(get_object_store)],
    settings: Annotated[Settings, Depends(get_settings)],
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
        await database.create_document_with_job(
            record_id,
            document,
            job_record_id,
            job_type="ocr",
        )
    except SurrealDatabaseError as error:
        # A connection can fail after COMMIT reaches the database. Keep the
        # source object so an ambiguously committed durable job is still valid.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata could not be saved",
        ) from error

    await _publish_new_job(database, settings, job_record_id)

    return DocumentUploadAcceptedResponse(document_id=document_id, job_id=job_id)


async def _publish_new_job(
    database: SurrealDatabase, settings: Settings, job_record_id: str
) -> None:
    """Use RabbitMQ as the fast path; retain the outbox when it cannot publish."""

    if not settings.rabbitmq_enabled:
        return

    logger = get_logger()
    try:
        event = await database.get_pending_job_dispatch_event(job_record_id)
    except SurrealDatabaseError:
        logger.exception(
            "new_job_outbox_event_read_failed", extra={"jobId": job_record_id}
        )
        return
    if event is None:
        logger.error("new_job_outbox_event_missing", extra={"jobId": job_record_id})
        return

    event_id = str(event["id"]).split(":", maxsplit=1)[-1]
    broker = RabbitMqBroker(settings)
    try:
        await broker.connect()
        await broker.publish_outbox_event(event)
        await database.mark_outbox_published(event_id)
        OUTBOX_PUBLISHES.labels(type="job.queued", result="published").inc()
    except Exception as error:
        OUTBOX_PUBLISHES.labels(type="job.queued", result=_publish_result(error)).inc()
        logger.exception("new_job_publish_failed", extra={"jobId": job_record_id})
        try:
            await database.mark_outbox_failed(event_id, str(error))
        except SurrealDatabaseError:
            logger.exception(
                "new_job_publish_failure_not_recorded",
                extra={"jobId": job_record_id},
            )
    finally:
        await broker.close()
