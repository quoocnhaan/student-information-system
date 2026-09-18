"""Tests for worker retry classification and backoff."""

import httpx

from app.application.ocr_jobs import PermanentJobError
from app.config import Settings
from app.infrastructure.ocr import OcrError
from app.worker import _is_retryable, _retry_at


def test_source_errors_are_not_retried() -> None:
    assert _is_retryable(PermanentJobError("missing source")) is False
    assert _is_retryable(OcrError("invalid PDF")) is False


def test_http_failure_wrapped_by_ocr_error_is_retried() -> None:
    error = OcrError("LM Studio OCR request failed")
    error.__cause__ = httpx.ReadTimeout("socket timed out")

    assert _is_retryable(error) is True


def test_retry_backoff_is_capped() -> None:
    settings = Settings(job_retry_base_seconds=10, job_retry_max_seconds=20)
    retry_at = _retry_at(settings, attempts=10)

    seconds_until_retry = (retry_at - retry_at.now(retry_at.tzinfo)).total_seconds()
    assert 19 <= seconds_until_retry <= 22
