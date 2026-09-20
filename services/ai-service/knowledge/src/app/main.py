"""FastAPI application entry point for the knowledge module."""

import asyncio
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.api.v1.router import router as v1_router
from app.config import Settings, get_settings
from app.infrastructure.minio import MinioObjectStore
from app.infrastructure.rabbitmq import RabbitMqBroker
from app.infrastructure.surreal import SurrealDatabase
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
    if settings.rabbitmq_enabled:
        status_task = asyncio.create_task(
            _run_status_subscription(app, settings, status_stop)
        )

    try:
        yield
    finally:
        status_stop.set()
        if status_task is not None:
            await status_task
        if database is not None:
            await database.close()


async def _run_status_subscription(
    app: FastAPI, settings: Settings, stop: asyncio.Event
) -> None:
    """Reconnect the transient status subscriber without blocking REST startup."""

    logger = get_logger()
    while not stop.is_set():
        broker = RabbitMqBroker(settings)
        try:
            await broker.connect()
            await broker.consume_status(app.state.job_status_hub.broadcast)
            app.state.rabbitmq = broker
            await stop.wait()
        except Exception:
            logger.exception("status_subscription_failed")
            try:
                await asyncio.wait_for(stop.wait(), timeout=2)
            except TimeoutError:
                pass
        finally:
            await broker.close()
            if getattr(app.state, "rabbitmq", None) is broker:
                del app.state.rabbitmq


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
