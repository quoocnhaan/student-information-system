"""Job-service configuration."""

import json
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    surreal_url: str = "ws://localhost:8002"
    surreal_user: str = "root"
    surreal_password: str = "root"
    surreal_namespace: str = "sis"
    surreal_database: str = "jobs"
    rabbitmq_url: str = "amqp://guest:guest@localhost/"
    worker_token: str = ""
    owner_tokens_json: str = "{}"
    registered_types: str = "knowledge:ocr_pdf"
    replay_batch_size: int = Field(default=100, ge=1, le=1000)

    model_config = SettingsConfigDict(env_prefix="JOB_", env_file=".env", extra="ignore")

    @property
    def owner_tokens(self) -> dict[str, str]:
        values = json.loads(self.owner_tokens_json)
        if not isinstance(values, dict) or not all(isinstance(k, str) and isinstance(v, str) and v for k, v in values.items()):
            raise ValueError("JOB_OWNER_TOKENS_JSON must map owners to nonempty tokens")
        return values

    @property
    def allowed_types(self) -> set[tuple[str, str]]:
        return {tuple(item.strip().split(":", 1)) for item in self.registered_types.split(",") if item.strip()}

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if not self.worker_token or not self.owner_tokens:
            raise ValueError("JOB_WORKER_TOKEN and JOB_OWNER_TOKENS_JSON are required")
        if any(len(pair) != 2 or not all(pair) for pair in self.allowed_types):
            raise ValueError("Invalid JOB_REGISTERED_TYPES")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
