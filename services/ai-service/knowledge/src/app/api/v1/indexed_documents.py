"""Indexed document library, detail, metadata and correction routes."""
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from app.api.v1.document_helpers import _document_record_id_or_none, indexed_header, indexed_pages
from app.api.v1.schemas.documents import (
    ChunkCorrectionRequest, IndexedChunksResponse, IndexedDocumentListResponse,
    IndexedDocumentResponse, IndexedMetadataResponse, IndexedMetadataUpdateRequest,
)
from app.dependencies import get_database
from app.infrastructure.surreal import SurrealDatabase, SurrealDatabaseError

router = APIRouter(prefix="/documents", tags=["indexed documents"])


@router.get("", response_model=IndexedDocumentListResponse)
async def list_indexed_documents(
    database: Annotated[SurrealDatabase, Depends(get_database)],
    q: Annotated[str, Query(max_length=500)] = "",
    document_type: Annotated[str | None, Query(max_length=120)] = None,
    language: Annotated[str | None, Query(max_length=12)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> dict:
    """Browse persisted indexed documents independently of upload history."""
    try:
        return await database.list_indexed_documents(
            q=q.strip(), document_type=document_type, language=language,
            page=page, page_size=page_size,
        )
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Document library is unavailable") from error


@router.get("/{document_id}/chunks", response_model=IndexedChunksResponse)
async def get_indexed_chunks(
    document_id: str, database: Annotated[SurrealDatabase, Depends(get_database)],
) -> dict:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        result = await database.indexed_document(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Document chunks are unavailable") from error
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    document, chunks = result
    if document["process_status"] != "indexed":
        raise HTTPException(status_code=409, detail="Document is not indexed")
    return {"document_id": str(document["id"]), "pages": indexed_pages(chunks)}


@router.post("/{document_id}/corrections", status_code=202)
async def request_corrections(
    document_id: str, body: ChunkCorrectionRequest, background_tasks: BackgroundTasks,
    request: Request, database: Annotated[SurrealDatabase, Depends(get_database)],
) -> dict:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        if await database.get_document(record_id) is None:
            raise HTTPException(status_code=404, detail="Document not found")
        job = await database.request_chunk_correction(record_id, body.chunk_id)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Correction is unavailable") from error
    if job is None:
        raise HTTPException(status_code=409, detail="Chunks are unavailable for correction")
    publisher = getattr(request.app.state, "publisher", None)
    if publisher is not None:
        background_tasks.add_task(publisher.publish, job)
    return {"job_id": str(job["id"])}



@router.get("/{document_id}", response_model=IndexedDocumentResponse)
async def get_indexed_document(document_id: str, database: Annotated[SurrealDatabase, Depends(get_database)]) -> dict:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        result = await database.indexed_document(record_id)
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Document detail is unavailable") from error
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    document, chunks = result
    if document["process_status"] != "indexed":
        raise HTTPException(status_code=409, detail="Document is not indexed")
    return {**indexed_header(document), "pages": indexed_pages(chunks)}


@router.put("/{document_id}/metadata", response_model=IndexedMetadataResponse)
async def update_metadata(document_id: str, body: IndexedMetadataUpdateRequest,
                          database: Annotated[SurrealDatabase, Depends(get_database)]) -> dict:
    record_id = _document_record_id_or_none(document_id)
    if record_id is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        saved = await database.update_indexed_metadata(record_id, body.expected_version, body.metadata.model_dump(mode="json"))
        if saved is None:
            current = await database.get_document(record_id)
            if current is None:
                raise HTTPException(status_code=404, detail="Document not found")
            if current["process_status"] != "indexed":
                raise HTTPException(status_code=409, detail="Document is not indexed")
            raise HTTPException(status_code=409, detail="Metadata version is stale. Reload latest metadata before saving.")
    except SurrealDatabaseError as error:
        raise HTTPException(status_code=503, detail="Metadata could not be saved") from error
    return indexed_header(saved)
