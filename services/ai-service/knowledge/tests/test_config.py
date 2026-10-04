from pytest import MonkeyPatch

from app.config import Settings
import pytest
from pydantic import ValidationError


@pytest.mark.parametrize("name", [
    "database_timeout_seconds", "index_commit_timeout_seconds", "failure_timeout_seconds",
    "startup_recovery_timeout_seconds", "embedding_timeout_seconds", "ocr_processing_timeout_seconds",
    "correction_processing_timeout_seconds", "index_processing_timeout_seconds",
])
def test_worker_deadlines_are_positive_environment_settings(monkeypatch, name):
    monkeypatch.setenv("KNOWLEDGE_" + name.upper(), "0.5")
    assert getattr(Settings(_env_file=None), name) == 0.5
    monkeypatch.setenv("KNOWLEDGE_" + name.upper(), "0")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_treats_blank_optional_metrics_port_as_unset(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setenv("KNOWLEDGE_METRICS_PORT", "")

    assert Settings(_env_file=None).metrics_port is None


def test_worker_settings_defaults_and_overrides(monkeypatch: MonkeyPatch) -> None:
    defaults = Settings(_env_file=None)
    assert defaults.lmstudio_ocr_model == "lightonocr-2-1b"
    assert defaults.ocr_max_output_tokens == 4096
    assert defaults.ocr_timeout_seconds == 60
    assert defaults.worker_queues == "ocr"
    monkeypatch.setenv("LMSTUDIO_OCR_MODEL", "custom-vision")
    monkeypatch.setenv("KNOWLEDGE_OCR_MAX_OUTPUT_TOKENS", "2048")
    monkeypatch.setenv("KNOWLEDGE_OCR_TIMEOUT_SECONDS", "30")
    monkeypatch.setenv("KNOWLEDGE_WORKER_QUEUES", "ocr,correct")
    settings = Settings(_env_file=None)
    assert settings.lmstudio_ocr_model == "custom-vision"
    assert settings.ocr_max_output_tokens == 2048
    assert settings.ocr_timeout_seconds == 30
    assert settings.worker_queues == "ocr,correct"
