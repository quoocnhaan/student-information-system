"""A second owner must work without changing the delivery core."""

import asyncio
import json
from worker_service.core import Envelope, Registry, execute


class FakeHandler:
    def __init__(self, owner: str, type_: str) -> None:
        self.owner = owner
        self.type = type_
        self.version = 1
        self.calls = []

    async def process(self, job_id, claim_id, claimed):
        self.calls.append((job_id, claimed["owner"]))
        return "result:1"

    async def fail_domain(self, job_id, claim_id):
        raise AssertionError("success should not call fail_domain")


class FakeJobs:
    def __init__(self):
        self.completed = []

    async def claim(self, job_id, claim_id, owner, type_):
        return {"id": job_id, "owner": owner, "type": type_}

    async def complete(self, job_id, claim_id, result_ref):
        self.completed.append((job_id, result_ref))


class FakeMessage:
    acked = False

    async def ack(self):
        self.acked = True


def test_exact_route_for_two_owners():
    registry = Registry()
    knowledge = FakeHandler("knowledge", "ocr_pdf")
    enrollment = FakeHandler("enrollment", "build_report")
    registry.register(knowledge)
    registry.register(enrollment)
    jobs = FakeJobs()
    messages = [FakeMessage(), FakeMessage()]

    async def run():
        for owner, type_, message in (
            ("knowledge", "ocr_pdf", messages[0]),
            ("enrollment", "build_report", messages[1]),
        ):
            envelope = Envelope.decode(json.dumps({"version": 1, "owner": owner, "type": type_, "job_id": "job:123"}).encode())
            await execute(envelope, registry.get(envelope), jobs, message)

    asyncio.run(run())
    assert knowledge.calls == [("job:123", "knowledge")]
    assert enrollment.calls == [("job:123", "enrollment")]
    assert all(message.acked for message in messages)
    assert jobs.completed == [("job:123", "result:1"), ("job:123", "result:1")]


def test_unknown_version_and_duplicate_registration():
    registry = Registry()
    handler = FakeHandler("knowledge", "ocr_pdf")
    registry.register(handler)
    try:
        registry.register(handler)
    except ValueError:
        pass
    else:
        raise AssertionError("duplicate registration was accepted")
    try:
        Envelope.decode(b'{"version":2,"owner":"knowledge","type":"ocr_pdf","job_id":"job:123"}')
    except ValueError:
        pass
    else:
        raise AssertionError("unsupported envelope was accepted")
