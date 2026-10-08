"""REST and live events share the public job version contract."""

import asyncio

from fastapi.testclient import TestClient

from app.api.v1 import jobs
from app.config import Settings
from app.main import create_app


def test_rest_and_websocket_versions_omit_internal_fields(monkeypatch):
    job_id = "job:job_" + "a" * 32
    row = {
        "id": job_id, "type": "ocr_pdf", "document_id": "document:test",
        "status": "running", "step": "ocr", "progress": 20, "version": 5,
        "followup_job_ids": [], "attempt_id": "private", "worker_id": "worker",
        "worker_run_id": "run", "payload": {},
    }

    class Database:
        client = None

        def __init__(self, *_):
            self.row = dict(row)
            self.client = self

        async def connect(self):
            pass

        async def close(self):
            pass

        async def kill(self, _):
            pass

        async def get_job(self, _):
            return dict(self.row)

        async def subscribe_jobs(self):
            async def events():
                for version in (4, 5, 6):
                    self.row["version"] = version
                    yield {"result": {"id": job_id}}
                await asyncio.Event().wait()

            return "subscription", events()

    monkeypatch.setattr(jobs, "SurrealDatabase", Database)
    monkeypatch.setattr(jobs, "get_settings", lambda: Settings(_env_file=None))
    app = create_app()
    app.state.database = Database()
    client = TestClient(app)
    response = client.get(f"/v1/jobs/{job_id}").json()
    assert response["version"] == 5 and response["type"] == "ocr"
    with client.websocket_connect(f"/v1/ws/jobs/{job_id}") as socket:
        snapshot = socket.receive_json()
        changed = socket.receive_json()
        assert snapshot["event_type"] == "job.status_snapshot"
        assert snapshot["version"] == 5
        assert changed["event_type"] == "job.status_changed"
        assert changed["version"] == 6
    for public in (response, snapshot, changed):
        assert public["followup_job_ids"] == []
        assert not {
            "sequence", "next_job_id", "claim_id", "attempt_id",
            "worker_id", "worker_run_id", "payload",
        }.intersection(public)
