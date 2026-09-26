"""Sequence handling for transient WebSocket fan-out."""

import asyncio

from fastapi.testclient import TestClient

from app.main import create_app
from app.websocket_hub import JobStatusHub


class _Socket:
    def __init__(self) -> None:
        self.events: list[dict] = []

    async def send_json(self, event: dict) -> None:
        self.events.append(event)


def test_hub_ignores_duplicate_and_out_of_order_events() -> None:
    async def scenario() -> list[dict]:
        hub = JobStatusHub()
        socket = _Socket()
        await hub.add("job:job_a", socket)
        await hub.broadcast({"job_id": "job:job_a", "sequence": 4, "progress": 40})
        await hub.broadcast({"job_id": "job:job_a", "sequence": 3, "progress": 30})
        await hub.broadcast({"job_id": "job:job_a", "sequence": 4, "progress": 40})
        await hub.broadcast({"job_id": "job:job_a", "sequence": 5, "progress": 50})
        await hub.remove("job:job_a", socket)
        return socket.events

    assert asyncio.run(scenario()) == [
        {"job_id": "job:job_a", "sequence": 4, "progress": 40},
        {"job_id": "job:job_a", "sequence": 5, "progress": 50},
    ]


def test_subscriber_starts_with_newer_event_instead_of_stale_snapshot() -> None:
    async def scenario() -> list[dict]:
        hub = JobStatusHub()
        socket = _Socket()
        await hub.broadcast({"job_id": "job:job_a", "sequence": 8, "progress": 80})
        await hub.subscribe(
            "job:job_a",
            socket,
            {"job_id": "job:job_a", "sequence": 6, "progress": 60},
        )
        await hub.remove("job:job_a", socket)
        return socket.events

    assert asyncio.run(scenario()) == [
        {"job_id": "job:job_a", "sequence": 8, "progress": 80}
    ]


def test_websocket_starts_with_durable_job_snapshot() -> None:
    record_id = "job_" + ("a" * 32)

    class _Database:
        async def get_job(self, requested_id: str):
            assert requested_id == record_id
            return {
                "id": f"job:{record_id}",
                "type": "ocr",
                "document_id": "document:doc_a",
                "status": "running",
                "step": "ocr",
                "progress": 40,
                "processed_pages": 2,
                "total_pages": 5,
                "sequence": 7,
            }

    app = create_app()
    with TestClient(app) as client:
        client.app.state.database = _Database()
        client.app.state.job_status_live = True
        with client.websocket_connect(f"/v1/ws/jobs/job:{record_id}") as websocket:
            event = websocket.receive_json()

    assert event["event_type"] == "job.status_snapshot"
    assert event["job_id"] == f"job:{record_id}"
    assert event["sequence"] == 7
    assert event["progress"] == 40
