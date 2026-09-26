"""Database change notifications expose only the public job status contract."""

import asyncio
from types import SimpleNamespace

from app.job_status_subscription import _broadcast_job


def test_changed_job_is_reloaded_and_mapped_for_websocket_clients() -> None:
    class _Database:
        async def get_job(self, record_id: str):
            assert record_id == "job_a"
            return {
                "id": "job:job_a",
                "document_id": "document:doc_a",
                "type": "ocr",
                "status": "running",
                "step": "ocr",
                "progress": 45,
                "processed_pages": 2,
                "sequence": 7,
                "secret": "never send this",
            }

    class _Hub:
        def __init__(self) -> None:
            self.events = []

        async def broadcast(self, event):
            self.events.append(event)

    hub = _Hub()
    app = SimpleNamespace(state=SimpleNamespace(database=_Database(), job_status_hub=hub))
    asyncio.run(_broadcast_job(app, "job:job_a"))

    assert len(hub.events) == 1
    assert hub.events[0]["job_id"] == "job:job_a"
    assert hub.events[0]["sequence"] == 7
    assert hub.events[0]["event_type"] == "job.status_changed"
    assert "secret" not in hub.events[0]
