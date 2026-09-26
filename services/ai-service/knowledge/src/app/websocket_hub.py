"""Authenticated, sequence-aware job status WebSocket fan-out."""

import asyncio
from collections import defaultdict
from collections.abc import Mapping
from typing import Any

from fastapi import WebSocket

from app.observability.logging import get_logger
from app.observability.metrics import WEBSOCKET_CLIENTS, WEBSOCKET_DROPS


class JobStatusHub:
    """Keep only live sockets; durable recovery remains the REST endpoint's job."""

    def __init__(self) -> None:
        self._clients: dict[str, set[WebSocket]] = defaultdict(set)
        self._highest_sequence: dict[str, int] = {}
        self._latest_event: dict[str, Mapping[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def add(self, job_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients[job_id].add(websocket)
            WEBSOCKET_CLIENTS.inc()

    async def subscribe(
        self,
        job_id: str,
        websocket: WebSocket,
        snapshot: Mapping[str, Any],
    ) -> None:
        """Send the newest known snapshot/event before making the socket live."""

        async with self._lock:
            latest = self._latest_event.get(job_id)
            initial = snapshot
            if latest is not None and int(latest.get("sequence", 0)) > int(
                snapshot.get("sequence", 0)
            ):
                initial = latest
            await websocket.send_json(dict(initial))
            self._clients[job_id].add(websocket)
            self._highest_sequence[job_id] = max(
                self._highest_sequence.get(job_id, 0), int(initial.get("sequence", 0))
            )
            WEBSOCKET_CLIENTS.inc()

    async def active_job_ids(self) -> tuple[str, ...]:
        async with self._lock:
            return tuple(self._clients)

    async def close_all(self) -> None:
        """Force clients onto REST recovery while the database stream is down."""

        async with self._lock:
            clients = tuple(socket for group in self._clients.values() for socket in group)
        for websocket in clients:
            try:
                await websocket.close(code=1013, reason="Live job updates are unavailable")
            except Exception:
                pass

    async def remove(self, job_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            clients = self._clients.get(job_id)
            if clients is None or websocket not in clients:
                return
            clients.remove(websocket)
            WEBSOCKET_CLIENTS.dec()
            WEBSOCKET_DROPS.inc()
            if not clients:
                self._clients.pop(job_id, None)
                self._highest_sequence.pop(job_id, None)
                self._latest_event.pop(job_id, None)

    async def broadcast(self, event: Mapping[str, Any]) -> None:
        """Ignore duplicate/out-of-order broker events and fan out the newest one."""

        job_id = str(event.get("job_id", ""))
        sequence = int(event.get("sequence", 0))
        async with self._lock:
            if not job_id or sequence <= self._highest_sequence.get(job_id, 0):
                return
            self._highest_sequence[job_id] = sequence
            self._latest_event[job_id] = dict(event)
            clients = tuple(self._clients.get(job_id, ()))

        failed: list[WebSocket] = []
        for websocket in clients:
            try:
                await websocket.send_json(dict(event))
            except Exception:  # noqa: BLE001 - a broken client must not block fan-out.
                failed.append(websocket)
        for websocket in failed:
            await self.remove(job_id, websocket)
        if failed:
            get_logger().warning(
                "websocket_broadcast_dropped",
                extra={"jobId": job_id, "droppedClients": len(failed)},
            )
