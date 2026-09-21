"""Environment-backed configuration for the knowledge module."""

import os
import socket
from functools import lru_cache

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings required by the running knowledge module."""

    environment: str = "development"
    log_level: str = "INFO"
    surreal_enabled: bool = False
    surreal_apply_schema_on_startup: bool = False
    surreal_url: str = Field(
        default="ws://localhost:8000",
        validation_alias=AliasChoices("SURREAL_URL", "KNOWLEDGE_SURREAL_URL"),
    )
    surreal_user: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SURREAL_USER", "KNOWLEDGE_SURREAL_USER"),
    )
    surreal_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SURREAL_PASSWORD", "KNOWLEDGE_SURREAL_PASSWORD"),
    )
    surreal_namespace: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "SURREAL_NAMESPACE", "KNOWLEDGE_SURREAL_NAMESPACE"
        ),
    )
    surreal_database: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SURREAL_DATABASE", "KNOWLEDGE_SURREAL_DATABASE"),
    )
    minio_endpoint: str = Field(
        default="localhost:9000",
        validation_alias=AliasChoices("MINIO_ENDPOINT", "KNOWLEDGE_MINIO_ENDPOINT"),
    )
    minio_access_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "MINIO_ACCESS_KEY", "MINIO_ROOT_USER", "KNOWLEDGE_MINIO_ACCESS_KEY"
        ),
    )
    minio_secret_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "MINIO_SECRET_KEY", "MINIO_ROOT_PASSWORD", "KNOWLEDGE_MINIO_SECRET_KEY"
        ),
    )
    minio_bucket: str = Field(
        default="knowledge-assets",
        validation_alias=AliasChoices("MINIO_BUCKET", "KNOWLEDGE_MINIO_BUCKET"),
    )
    minio_secure: bool = Field(
        default=False,
        validation_alias=AliasChoices("MINIO_SECURE", "KNOWLEDGE_MINIO_SECURE"),
    )
    lmstudio_base_url: str = Field(
        default="http://localhost:1234/v1",
        validation_alias=AliasChoices(
            "LMSTUDIO_BASE_URL", "KNOWLEDGE_LMSTUDIO_BASE_URL"
        ),
    )
    lmstudio_ocr_model: str = Field(
        default="lightonocr-2-1b",
        validation_alias=AliasChoices(
            "LMSTUDIO_OCR_MODEL", "KNOWLEDGE_LMSTUDIO_OCR_MODEL"
        ),
    )
    lmstudio_chat_model: str = Field(
        default="qwen2.5-14b-instruct",
        validation_alias=AliasChoices(
            "LMSTUDIO_CHAT_MODEL", "KNOWLEDGE_LMSTUDIO_CHAT_MODEL"
        ),
    )
    lmstudio_embedding_model: str = Field(
        default="text-embedding-nomic-embed-text-v1.5",
        validation_alias=AliasChoices(
            "LMSTUDIO_EMBEDDING_MODEL", "KNOWLEDGE_LMSTUDIO_EMBEDDING_MODEL"
        ),
    )
    max_upload_bytes: int = 50 * 1024 * 1024
    ocr_max_pages: int = 100
    ocr_max_output_tokens: int = 4096
    ocr_timeout_seconds: float = 120.0
    worker_id: str = Field(
        default_factory=lambda: f"{socket.gethostname()}-{os.getpid()}"
    )
    worker_lease_seconds: int = Field(default=180, ge=30)
    worker_heartbeat_seconds: int = Field(default=30, ge=5)
    job_max_attempts: int = Field(default=3, ge=1)
    job_retry_base_seconds: int = Field(default=10, ge=1)
    job_retry_max_seconds: int = Field(default=300, ge=1)
    rabbitmq_enabled: bool = False
    rabbitmq_url: str = Field(
        default="amqp://guest:guest@localhost/",
        validation_alias=AliasChoices("RABBITMQ_URL", "KNOWLEDGE_RABBITMQ_URL"),
    )
    rabbitmq_jobs_exchange: str = "knowledge.jobs"
    rabbitmq_jobs_queue: str = "knowledge.jobs.ocr"
    rabbitmq_status_exchange: str = "knowledge.status"
    outbox_batch_size: int = Field(default=100, ge=1, le=1000)
    recovery_sweep_seconds: float = Field(default=30.0, ge=1)
    database_poll_fallback_enabled: bool = True
    database_poll_fallback_seconds: float = Field(default=5.0, ge=0.1)
    websocket_heartbeat_seconds: float = Field(default=20.0, ge=1)
    # Until the wider application supplies user authentication, deployments can
    # require this bearer token for WebSocket subscriptions.
    websocket_auth_token: str | None = None
    metrics_port: int | None = Field(default=None, ge=1, le=65535)

    model_config = SettingsConfigDict(env_file=".env", env_prefix="KNOWLEDGE_")

    @model_validator(mode="after")
    def require_surreal_settings_when_enabled(self) -> "Settings":
        """Reject incomplete database configuration before opening a connection."""

        if self.surreal_enabled and not all(
            (
                self.surreal_user,
                self.surreal_password,
                self.surreal_namespace,
                self.surreal_database,
            )
        ):
            raise ValueError(
                "SURREAL_USER, SURREAL_PASSWORD, SURREAL_NAMESPACE, and "
                "SURREAL_DATABASE are required when KNOWLEDGE_SURREAL_ENABLED=true"
            )
        if self.worker_heartbeat_seconds >= self.worker_lease_seconds:
            raise ValueError(
                "KNOWLEDGE_WORKER_HEARTBEAT_SECONDS must be less than "
                "KNOWLEDGE_WORKER_LEASE_SECONDS"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return one settings instance for the process."""

    return Settings()
