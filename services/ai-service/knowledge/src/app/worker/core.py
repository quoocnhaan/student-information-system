"""Claim-before-ACK delivery with a local handler registry."""

import logging
from typing import Any, Protocol
from uuid import uuid4

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


async def execute(envelope: Envelope, handler: Handler, database: SurrealDatabase, message: Any) -> Any:
    claim_id = uuid4().hex
    try:
        claimed = await database.claim_job(envelope.job_id, claim_id, envelope.type)
    except Exception:
        await message.nack(requeue=True)
        return None
    if claimed is None:
        await message.ack()
        return None
    await message.ack()
    try:
        return await handler.process(envelope.job_id, claim_id, claimed)
    except Exception as error:
        logging.getLogger(__name__).exception("job_processor_failed", extra={"job_id": envelope.job_id})
        try:
            failure_handler = getattr(handler, "on_failure", None)
            if failure_handler is not None:
                await failure_handler(envelope.job_id, claim_id, claimed, str(error)[:500] or "Job processing failed")
            else:
                await database.fail_job(envelope.job_id, claim_id, str(error)[:500] or "Job processing failed")
        except Exception:
            logging.getLogger(__name__).exception("job_failure_not_persisted", extra={"job_id": envelope.job_id})
        return None
