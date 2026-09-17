"""FastAPI application entry point for the knowledge module."""

from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from app.api.v1.router import router as v1_router
from app.config import get_settings
from app.observability.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    yield


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
    return app


app = create_app()
