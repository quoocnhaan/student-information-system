"""Structured JSON logging written to standard output."""

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any


class JsonFormatter(logging.Formatter):
    """Emit the project-required request fields as JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname.lower(),
            "service": "knowledge-service",
            "message": record.getMessage(),
        }
        for field in (
            "environment",
            "requestId",
            "traceId",
            "method",
            "route",
            "statusCode",
            "durationMs",
            "errorCode",
        ):
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    """Configure process logging once, targeting stdout."""

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.handlers = [handler]


def get_logger() -> logging.Logger:
    """Return the module logger."""

    return logging.getLogger("knowledge")
