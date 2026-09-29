from pytest import MonkeyPatch

from app.config import Settings


def test_settings_treats_blank_optional_metrics_port_as_unset(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setenv("KNOWLEDGE_METRICS_PORT", "")

    assert Settings(_env_file=None).metrics_port is None
