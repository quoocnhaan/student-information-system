"""Versioned route registration."""

from fastapi import APIRouter

from app.api.v1.documents import router as documents_router
from app.api.v1.document_drafts import router as drafts_router
from app.api.v1.indexed_documents import router as indexed_router
from app.api.v1.health import router as health_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.jobs import websocket_router
from app.api.v1.retrieval import router as retrieval_router

router = APIRouter(prefix="/v1")
router.include_router(health_router)
router.include_router(documents_router)
router.include_router(drafts_router)
router.include_router(indexed_router)
router.include_router(jobs_router)
router.include_router(websocket_router)
router.include_router(retrieval_router)
