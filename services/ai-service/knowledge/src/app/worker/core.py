"""Claim-before-ACK delivery with a local handler registry."""

import asyncio
import logging
from typing import Any, Protocol
from uuid import uuid4

from app.config import Settings
from app.domain.job import validate_payload
from app.infrastructure.surreal import SurrealDatabase
from app.jobs.routes import Envelope


class Handler(Protocol):
    type: str
    version: int

    async def process(self, job_id: str, claim_id: str, claimed: dict) -> Any: ...


class Registry:
    def __init__(self) -> None:
        self.handlers: dict[tuple[str, int], Handler] = {}

    def register(self, handler: Handler) -> None:
        key = (handler.type, handler.version)
        if key in self.handlers:
            raise ValueError(f"Duplicate job handler: {key}")
        self.handlers[key] = handler

    def get(self, envelope: Envelope) -> Handler | None:
        return self.handlers.get((envelope.type, envelope.version))


class FailurePersistenceError(RuntimeError):
    """The worker must exit so startup recovery can finish bookkeeping."""


def processing_deadline(settings: Settings, job_type: str) -> float:
    if job_type == "ocr_pdf":
        return settings.ocr_processing_timeout_seconds
    if job_type == "correct_chunks":
        return settings.correction_processing_timeout_seconds
    return settings.index_processing_timeout_seconds


async def execute(envelope: Envelope, handler: Handler, database: SurrealDatabase, message: Any,
                  settings: Settings | None = None) -> Any:
    settings = settings or Settings(_env_file=None)
    claim_id = uuid4().hex
    try:
        claimed = await database.claim_job(envelope.job_id, claim_id, envelope.type)
    except Exception:
        await message.nack(requeue=True)
        return None
    if claimed is None:
        await message.ack()
        return None
    try:
        async with asyncio.timeout(processing_deadline(settings, envelope.type)):
            await message.ack()
            validate_payload(envelope.type, claimed.get("payload"))
            result = await handler.process(envelope.job_id, claim_id, claimed)
            if isinstance(database, SurrealDatabase):
                current = await database.get_job(envelope.job_id)
                if not current or current.get("status") != "completed" or current.get("claim_id") != claim_id:
                    raise RuntimeError("Processing returned without completing this claim")
            return result
    except Exception as error:
        logging.getLogger(__name__).exception("job_processor_failed", extra={"job_id": envelope.job_id})
        try:
            if isinstance(database, SurrealDatabase):
                try:
                    await database.close()
                except Exception:
                    logging.getLogger(__name__).exception("processing_connection_discard_failed")
                safe_error = "Job processing timed out; manual retry required" if isinstance(error, TimeoutError) else "Job processing failed; manual retry required"
                reconciled = await database.reconcile_failure(envelope.job_id, claim_id, safe_error)
                # A commit may have succeeded even though its response was
                # lost.  Recover the durable fan-out so delivery can publish
                # exactly those already-authorized jobs.
                if (reconciled.get("type") == "correct_chunks"
                        and reconciled.get("status") == "completed"
                        and reconciled.get("claim_id") == claim_id):
                    return reconciled.get("_followups", [])
                return None
            failure_handler = getattr(handler, "on_failure", None)
            if failure_handler is not None:
                await failure_handler(envelope.job_id, claim_id, claimed, str(error)[:500] or "Job processing failed")
            else:
                await database.fail_job(envelope.job_id, claim_id, str(error)[:500] or "Job processing failed")
        except Exception as failure:
            logging.getLogger(__name__).exception("job_failure_not_persisted", extra={"job_id": envelope.job_id})
            raise FailurePersistenceError("Failure persistence pending; worker restart required") from failure
        return None
