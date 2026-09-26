"""FastAPI application entry point for the knowledge module."""

import asyncio
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.api.v1.router import router as v1_router
from app.config import get_settings
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.surreal import SurrealDatabase
from app.job_status_subscription import run_job_status_subscription
from app.observability.logging import configure_logging, get_logger
from app.observability.metrics import JOB_STATE
from app.websocket_hub import JobStatusHub


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()
    app.state.settings = settings
    database: SurrealDatabase | None = None
    status_stop = asyncio.Event()
    status_task: asyncio.Task[None] | None = None
    app.state.object_store = MinioObjectStore(settings)

    if settings.surreal_enabled:
        database = SurrealDatabase(settings)
        await database.connect()
        if settings.surreal_apply_schema_on_startup:
            await database.apply_schema()
        app.state.database = database

    app.state.job_status_hub = JobStatusHub()
    app.state.job_status_live = False
    if settings.surreal_enabled:
        status_task = asyncio.create_task(
            run_job_status_subscription(app, settings, status_stop)
        )

    try:
        yield
    finally:
        status_stop.set()
        if status_task is not None:
            status_task.cancel()
            await asyncio.gather(status_task, return_exceptions=True)
        if database is not None:
            await database.close()


def create_app() -> FastAPI:
    """Create the knowledge HTTP interface."""

    settings = get_settings()
    app = FastAPI(
        title="Knowledge API",
        version="0.1.0",
        lifespan=lifespan,
    )
    logger = get_logger()

    @app.middleware("http")
    async def log_request(request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        started_at = perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request_failed",
                extra={
                    "environment": settings.environment,
                    "requestId": request_id,
                    "method": request.method,
                    "route": request.url.path,
                    "errorCode": "UNHANDLED_ERROR",
                },
            )
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )

        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_finished",
            extra={
                "environment": settings.environment,
                "requestId": request_id,
                "method": request.method,
                "route": request.url.path,
                "statusCode": response.status_code,
                "durationMs": round((perf_counter() - started_at) * 1000, 2),
            },
        )
        return response

    app.include_router(v1_router)

    @app.get("/metrics", include_in_schema=False)
    async def metrics(request: Request) -> Response:
        database = getattr(request.app.state, "database", None)
        if database is not None:
            try:
                counts = await database.get_job_counts()
                for state in ("queued", "running", "completed", "failed"):
                    JOB_STATE.labels(status=state).set(counts.get(state, 0))
            except Exception:
                logger.exception("job_metrics_refresh_failed")
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

    return app


app = create_app()
