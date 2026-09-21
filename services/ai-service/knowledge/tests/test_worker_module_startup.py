"""Regression tests for worker module execution order."""

import asyncio
import runpy
import sys


def test_worker_defines_helpers_before_starting_event_loop(monkeypatch) -> None:
    """``python -m app.worker`` must see helpers used by ``run_worker``."""

    observed: dict[str, bool] = {}

    def fake_run(coroutine) -> None:
        observed["record_id_defined"] = "_record_id" in coroutine.cr_frame.f_globals
        coroutine.close()

    monkeypatch.setattr(asyncio, "run", fake_run)

    existing_worker_module = sys.modules.pop("app.worker", None)
    try:
        runpy.run_module("app.worker", run_name="__main__")
    finally:
        if existing_worker_module is not None:
            sys.modules["app.worker"] = existing_worker_module

    assert observed["record_id_defined"] is True
