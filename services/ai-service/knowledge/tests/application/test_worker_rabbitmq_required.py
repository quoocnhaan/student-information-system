"""Workers must not have a database polling admission path."""

from pathlib import Path


def test_worker_contains_no_database_claim_fallback() -> None:
    worker = (Path(__file__).parents[2] / "src" / "app" / "worker.py").read_text(
        encoding="utf-8"
    )

    assert "claim_next_queued_job" not in worker
    assert "database_poll_fallback" not in worker
