"""Durable message format and workload routing."""

import json
import re
from dataclasses import dataclass

JOB_QUEUES = {"ocr_pdf": "ocr", "correct_ocr": "correct", "index_document": "index", "correct_chunks": "correct", "reembed_chunk": "index"}
_JOB_ID = re.compile(r"job:job_[0-9a-f]{32}\Z")


@dataclass(frozen=True)
class Envelope:
    version: int
    type: str
    job_id: str

    def encode(self) -> bytes:
        if self.version != 1 or self.type not in JOB_QUEUES or not _JOB_ID.fullmatch(self.job_id):
            raise ValueError("Invalid job envelope")
        result = json.dumps(
            {"version": self.version, "type": self.type, "job_id": self.job_id},
            separators=(",", ":"),
        ).encode("utf-8")
        if len(result) > 1024:
            raise ValueError("Job envelope exceeds 1 KiB")
        return result

    @classmethod
    def decode(cls, body: bytes) -> "Envelope":
        if len(body) > 1024:
            raise ValueError("Job envelope exceeds 1 KiB")
        try:
            data = json.loads(body)
        except (ValueError, UnicodeDecodeError, TypeError) as error:
            raise ValueError("Malformed job envelope") from error
        if not isinstance(data, dict) or set(data) != {"version", "type", "job_id"}:
            raise ValueError("Malformed job envelope")
        envelope = cls(data["version"], data["type"], data["job_id"])
        if type(envelope.version) is not int or type(envelope.type) is not str or type(envelope.job_id) is not str:
            raise ValueError("Malformed job envelope")
        envelope.encode()
        return envelope
