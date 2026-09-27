"""Service-neutral delivery, claim, and terminal-state rules."""

import json
import logging
import re
from dataclasses import dataclass
from typing import Protocol
from uuid import uuid4

from worker_service.clients import JobClient, PermanentError, TemporaryError, retry_temporary

_NAME = re.compile(r"[a-z][a-z0-9_]{0,63}\Z")
_JOB = re.compile(r"[A-Za-z0-9_.:-]{1,160}\Z")


@dataclass(frozen=True)
class Envelope:
    version: int
    owner: str
    type: str
    job_id: str

    @classmethod
    def decode(cls, body: bytes) -> "Envelope":
        if len(body) > 1024:
            raise ValueError("Job message is too large")
        data = json.loads(body)
        if not isinstance(data, dict) or set(data) != {"version", "owner", "type", "job_id"}:
            raise ValueError("Invalid job envelope")
        if type(data["version"]) is not int or data["version"] != 1:
            raise ValueError("Unsupported job envelope version")
        if not all(isinstance(data[key], str) for key in ("owner", "type", "job_id")):
            raise ValueError("Invalid job envelope fields")
        if not _NAME.fullmatch(data["owner"]) or not _NAME.fullmatch(data["type"]) or not _JOB.fullmatch(data["job_id"]):
            raise ValueError("Invalid job envelope values")
        return cls(**data)


class Handler(Protocol):
    owner: str
    type: str
    version: int

    async def process(self, job_id: str, claim_id: str, claimed: dict) -> str: ...
    async def fail_domain(self, job_id: str, claim_id: str) -> None: ...


class Registry:
    def __init__(self) -> None:
        self.handlers: dict[tuple[str, str, int], Handler] = {}

    def register(self, handler: Handler) -> None:
        key = (handler.owner, handler.type, handler.version)
        if key in self.handlers:
            raise ValueError(f"Duplicate job handler: {key}")
        self.handlers[key] = handler

    def get(self, envelope: Envelope) -> Handler | None:
        return self.handlers.get((envelope.owner, envelope.type, envelope.version))


async def execute(envelope: Envelope, handler: Handler, jobs: JobClient, message) -> None:
    """Claim before ACK; delegate task work while keeping lifecycle generic."""

    logger = logging.getLogger(__name__)
    claim_id = uuid4().hex
    try:
        claimed = await retry_temporary(lambda: jobs.claim(
            envelope.job_id, claim_id, envelope.owner, envelope.type
        ))
    except PermanentError as error:
        if "409:" in str(error) or "404:" in str(error):
            await message.ack()
        else:
            await message.reject(requeue=False)
        return
    except TemporaryError:
        await message.nack(requeue=True)
        return
    await message.ack()
    try:
        result_ref = await handler.process(envelope.job_id, claim_id, claimed)
    except Exception as error:
        logger.exception("job_processor_failed", extra={"job_id": envelope.job_id, "owner": envelope.owner, "type": envelope.type})
        try:
            await handler.fail_domain(envelope.job_id, claim_id)
            await retry_temporary(lambda: jobs.fail(envelope.job_id, claim_id, str(error)[:500] or "Job processing failed"))
        except Exception:
            logger.exception("job_failure_not_persisted", extra={"job_id": envelope.job_id})
        return
    try:
        await retry_temporary(lambda: jobs.complete(envelope.job_id, claim_id, result_ref))
    except Exception:
        # The domain result may already have committed; do not turn this into
        # a failed job or run the processor again.
        logger.exception("job_completion_not_persisted", extra={"job_id": envelope.job_id})
