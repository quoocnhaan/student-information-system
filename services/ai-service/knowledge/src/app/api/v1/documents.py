"""Document ingestion and review endpoints."""

import re
from collections.abc import Mapping
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.v1.schemas.documents import (
    DocumentMetadataResponse,
    DocumentResultResponse,
    DocumentUploadAcceptedResponse,
    ConfirmAcceptedResponse,
    ConfirmRequest,
    ChunkCorrectionRequest,
    IndexedChunksResponse,
    OcrDraftResponse,
    OcrPageResponse,
    SourceSummary,
)
from app.config import Settings, get_settings
from app.dependencies import get_database, get_object_store
from app.infrastructure.minio import MinioObjectStore, ObjectStoreError
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError

router = APIRouter(prefix="/documents", tags=["documents"])
_DOCUMENT_RECORD_ID = re.compile(r"doc_[0-9a-f]{32}")


@router.post(
    "",
    response_model=DocumentUploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_pdf(
    file: Annotated[UploadFile, File(description="PDF source document")],
    background_tasks: BackgroundTasks,
    request: Request,
    database: Annotated[SurrealDatabase, Depends(get_database)],
    object_store: Annotated[MinioObjectStore, Depends(get_object_store)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DocumentUploadAcceptedResponse:
    """Persist a PDF, document, and service-owned OCR job."""

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
        job = await database.create_document_with_job(record_id, document, job_record_id)
    except SurrealDatabaseError as error:
        # A connection can fail after a durable write reaches SurrealDB. Keep
        # the source object so conservative orphan cleanup can reconcile it.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document metadata could not be saved",
        ) from error

    publisher = getattr(request.app.state, "publisher", None)
    if publisher is not None:
        background_tasks.add_task(publisher.publish, job)
    return DocumentUploadAcceptedResponse(document_id=document_id, job_id=str(job["id"]))


@router.post("/{document_id}/confirm", response_model=ConfirmAcceptedResponse, status_code=202)
async def confirm_document(
    document_id: str,
    body: ConfirmRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    database: Annotated[SurrealDatabase, Depends(get_database)],
) -> ConfirmAcceptedResponse:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        result = await database.get_document_result(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Review could not be confirmed") from error
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    document, draft = result
    requested_pages = set(body.selected_pages)
    if document.get("process_status") == "review" and draft is not None and draft.get("status") == "draft":
        pages = draft.get("pages") if isinstance(draft.get("pages"), list) else []
        known_pages = {entry.get("page") for entry in pages if isinstance(entry, Mapping)}
        edit_pages = {entry.page for entry in body.page_edits}
        if not requested_pages.issubset(known_pages) or not edit_pages.issubset(known_pages):
            raise HTTPException(status_code=422, detail="Confirmation contains an unknown page")
        edits = {entry.page: entry.reviewed_text for entry in body.page_edits}
        selected_text = [
            edits.get(int(entry["page"]), entry.get("raw_text", ""))
            for entry in pages
            if isinstance(entry, Mapping) and entry.get("page") in requested_pages
        ]
        if not any(isinstance(text, str) and text.strip() for text in selected_text):
            raise HTTPException(status_code=422, detail="At least one selected page must contain indexable text")
    try:
        job = await database.confirm_review(
            record_id, body.expected_revision, body.metadata.model_dump(mode="json"),
            [entry.model_dump() for entry in body.page_edits], sorted(requested_pages),
        )
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Review could not be confirmed") from error
    if job is None:
        raise HTTPException(status_code=409, detail="Review is stale or not ready to confirm")
    publisher = getattr(request.app.state, "publisher", None)
    if publisher is not None and job["status"] == "queued":
        background_tasks.add_task(publisher.publish, job)
    return ConfirmAcceptedResponse(document_id=f"document:{record_id}", job_id=str(job["id"]))


@router.get("/{document_id}/chunks", response_model=IndexedChunksResponse)
async def get_indexed_chunks(
    document_id: str, database: Annotated[SurrealDatabase, Depends(get_database)],
) -> dict:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if await database.get_document(record_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks = await database.indexed_chunks(record_id)
    if chunks is None:
        raise HTTPException(status_code=409, detail="Document is not indexed")
    pages: dict[int, list[dict]] = {}
    for chunk in chunks:
        position = chunk["position"]
        pages.setdefault(int(position["page_start"]), []).append({
            "id": str(chunk["id"]), "text": chunk["text"], "hierarchy": chunk["hierarchy"],
            "chunk_index": position["chunk_index"], "page_start": position["page_start"],
            "page_end": position["page_end"], "embedding_status": chunk.get("embedding_status", "ok"),
            "updated_at": str(chunk.get("updated_at", "")),
            "active_job_id": str(chunk["active_job_id"]) if chunk.get("active_job_id") else None,
            "last_embedding_job_id": str(chunk["last_embedding_job_id"]) if chunk.get("last_embedding_job_id") else None,
            "correction": chunk.get("correction"),
        })
    return {"document_id": f"document:{record_id}", "pages": [
        {"page": page, "chunks": items} for page, items in sorted(pages.items())
    ]}


@router.post("/{document_id}/corrections", status_code=202)
async def request_corrections(
    document_id: str, body: ChunkCorrectionRequest, background_tasks: BackgroundTasks,
    request: Request, database: Annotated[SurrealDatabase, Depends(get_database)],
) -> dict:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    job = await database.request_chunk_correction(record_id, body.chunk_id)
    if job is None:
        raise HTTPException(status_code=409, detail="Chunks are unavailable for correction")
    publisher = getattr(request.app.state, "publisher", None)
    if publisher is not None:
        background_tasks.add_task(publisher.publish, job)
    return {"job_id": str(job["id"])}


@router.get("/{document_id}/result", response_model=DocumentResultResponse)
async def get_document_result(
    document_id: str,
    database: Annotated[SurrealDatabase, Depends(get_database)],
) -> DocumentResultResponse:
    """Return completed OCR output without leaking storage internals."""

    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        result = await database.get_document_result(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document result is unavailable",
        ) from error
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document, draft = result
    if document.get("process_status") != "review" or draft is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="OCR result is not ready",
        )
    return _as_document_result(document, draft)


@router.get("/{document_id}/source")
async def stream_document_source(
    document_id: str,
    request: Request,
    database: Annotated[SurrealDatabase, Depends(get_database)],
    object_store: Annotated[MinioObjectStore, Depends(get_object_store)],
) -> StreamingResponse:
    """Stream the private source PDF with single-range support for PDF viewers."""

    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        document = await database.get_document(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document source is unavailable",
        ) from error
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    source = document.get("source")
    if not isinstance(source, Mapping) or not isinstance(source.get("object_key"), str):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document source not found")
    object_key = source["object_key"]
    try:
        size = await object_store.get_size(object_key)
    except ObjectStoreError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document source is unavailable",
        ) from error
    if size < 1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document source not found")

    start, end = _source_range_or_error(request.headers.get("range"), size)
    length = end - start + 1
    filename = _safe_attachment_filename(str(source.get("original_filename", "document.pdf")))
    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "Content-Disposition": f'inline; filename="{filename}"',
        "Content-Length": str(length),
    }
    response_status = status.HTTP_200_OK
    if request.headers.get("range") is not None:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        response_status = status.HTTP_206_PARTIAL_CONTENT
    return StreamingResponse(
        object_store.iter_pdf_range(object_key, start, length),
        status_code=response_status,
        media_type="application/pdf",
        headers=headers,
    )


def _as_document_result(
    document: Mapping[str, Any], draft: Mapping[str, Any]
) -> DocumentResultResponse:
    source = document.get("source")
    if not isinstance(source, Mapping):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document source not found")
    pages = draft.get("pages")
    if not isinstance(pages, list):
        pages = []
    metadata = {
        field: document.get(field)
        for field in (
            "title",
            "document_type",
            "document_number",
            "description",
            "cohort",
            "program_scope",
            "language",
        )
    }
    return DocumentResultResponse(
        document_id=str(document["id"]),
        process_status=str(document["process_status"]),
        source=SourceSummary(
            original_filename=str(source.get("original_filename", "document.pdf")),
            mime_type=str(source.get("mime_type", "application/pdf")),
        ),
        page_count=document.get("page_count"),
        metadata=DocumentMetadataResponse(**metadata),
        ocr_draft=OcrDraftResponse(
            id=str(draft["id"]),
            status=str(draft["status"]),
            revision=int(draft.get("revision", 1)),
            pages=[OcrPageResponse.model_validate(page) for page in pages],
        ),
    )


def _document_record_id_or_none(document_id: str) -> str | None:
    record_id = document_id.removeprefix("document:")
    return record_id if _DOCUMENT_RECORD_ID.fullmatch(record_id) else None


def _source_range_or_error(range_header: str | None, size: int) -> tuple[int, int]:
    if range_header is None:
        return 0, size - 1
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
    if match is None or (not match.group(1) and not match.group(2)):
        raise HTTPException(
            status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
            detail="Invalid PDF byte range",
            headers={"Content-Range": f"bytes */{size}"},
        )
    start_text, end_text = match.groups()
    if start_text:
        start = int(start_text)
        end = int(end_text) if end_text else size - 1
        if start >= size or end < start:
            raise HTTPException(
                status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
                detail="PDF byte range is not satisfiable",
                headers={"Content-Range": f"bytes */{size}"},
            )
        return start, min(end, size - 1)
    suffix_length = int(end_text)
    if suffix_length < 1:
        raise HTTPException(
            status_code=status.HTTP_416_RANGE_NOT_SATISFIABLE,
            detail="PDF byte range is not satisfiable",
            headers={"Content-Range": f"bytes */{size}"},
        )
    return max(size - suffix_length, 0), size - 1


def _safe_attachment_filename(filename: str) -> str:
    """Prevent header injection while retaining a useful inline PDF filename."""

    sanitized = re.sub(r"[\r\n\"\\\\]", "_", Path(filename).name).strip()
    return sanitized or "document.pdf"
