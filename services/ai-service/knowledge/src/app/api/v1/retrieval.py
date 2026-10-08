"""Admin retrieval endpoints; context-free requests explore indexed content."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.v1.schemas.retrieval import (
    ExactRequest, LookupRequest, RetrievalResponse, RetrievalOptionsResponse, SearchRequest,
)
from app.config import get_settings
from app.dependencies import get_database
from app.domain.document import MAJOR_OPTIONS
from app.infrastructure.embeddings import embed_texts
from app.infrastructure.retrieval import RetrievalDatabase
from app.infrastructure.surreal import SurrealDatabase

router = APIRouter(prefix="/retrieval", tags=["retrieval"])
Database = Annotated[SurrealDatabase, Depends(get_database)]
BOUNDARIES = [
    "Without student context, results are admin exploration without cohort/major filtering.",
    "Exact lookup searches indexed chunk text only; phrases across chunks and pages omitted from indexing are not searchable.",
    "Semantic scores are ranking measures, not probabilities. Incompatible embedding models/profiles are excluded.",
]


@router.get("/options", response_model=RetrievalOptionsResponse)
async def options(database: Database) -> dict:
    try:
        documents = await RetrievalDatabase(database).options_documents()
    except Exception as error:
        raise HTTPException(503, "Retrieval database is unavailable") from error
    return {"modes": ["search", "lookup", "exact"], "search_modes": ["semantic"],
            "majors": list(MAJOR_OPTIONS), "documents": documents, "boundaries": BOUNDARIES,
            "defaults": {"mode": "semantic", "limit": 10, "page_size": 20, "case_sensitive": False},
            "limits": {"query_length": 4000, "document_number_length": 200, "document_ids": 100,
                       "limit": 100, "page_size": 100, "cohort_min": 1900, "cohort_max": 9999}}


async def retrieve(body, database, settings):
    adapter = RetrievalDatabase(database)
    if isinstance(body, SearchRequest):
        try:
            vector = (await embed_texts([body.query], settings, purpose="query"))[0]
        except Exception as error:
            raise HTTPException(503, "Embedding service is unavailable or returned an invalid vector") from error
        operation = adapter.search(body, vector, settings.lmstudio_embedding_model)
    elif isinstance(body, LookupRequest):
        operation = adapter.lookup(body)
    else:
        operation = adapter.exact(body)
    try:
        async with asyncio.timeout(settings.database_timeout_seconds):
            result = await operation
    except Exception as error:
        raise HTTPException(503, "Retrieval database is unavailable") from error
    return {**result, "filters": {**body.model_dump(exclude={"query"}),
                                  "active_only": True, "indexed_only": True,
                                  "admin_exploration": body.student_context is None},
            "page": getattr(body, "page", None), "page_size": getattr(body, "page_size", None)}


@router.post("/search", response_model=RetrievalResponse)
async def search(body: SearchRequest, request: Request, database: Database):
    return await retrieve(body, database, getattr(request.app.state, "settings", None) or get_settings())


@router.post("/lookup", response_model=RetrievalResponse)
async def lookup(body: LookupRequest, request: Request, database: Database):
    return await retrieve(body, database, getattr(request.app.state, "settings", None) or get_settings())


@router.post("/exact", response_model=RetrievalResponse)
async def exact(body: ExactRequest, request: Request, database: Database):
    return await retrieve(body, database, getattr(request.app.state, "settings", None) or get_settings())
