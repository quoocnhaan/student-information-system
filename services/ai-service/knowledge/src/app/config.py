"""Environment-backed configuration for the knowledge module."""

from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator, model_validator
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
    lmstudio_chat_model: str = Field(
        default="qwen2.5-14b-instruct",
        validation_alias=AliasChoices(
            "LMSTUDIO_CHAT_MODEL", "KNOWLEDGE_LMSTUDIO_CHAT_MODEL"
        ),
    )
    lmstudio_ocr_model: str = Field(
        default="lightonocr-2-1b",
        validation_alias=AliasChoices("LMSTUDIO_OCR_MODEL", "KNOWLEDGE_LMSTUDIO_OCR_MODEL"),
    )
    lmstudio_embedding_model: str = Field(
        default="text-embedding-nomic-embed-text-v1.5",
        validation_alias=AliasChoices(
            "LMSTUDIO_EMBEDDING_MODEL", "KNOWLEDGE_LMSTUDIO_EMBEDDING_MODEL"
        ),
    )
    max_upload_bytes: int = 50 * 1024 * 1024
    ocr_max_pages: int = 100
    ocr_max_output_tokens: int = Field(default=4096, ge=1)
    ocr_timeout_seconds: float = Field(default=60, gt=0)
    correction_timeout_seconds: float = Field(default=120, gt=0)
    embedding_batch_size: int = Field(default=16, ge=1)
    embedding_timeout_seconds: float = Field(default=120, gt=0)
    database_timeout_seconds: float = Field(default=30, gt=0)
    index_commit_timeout_seconds: float = Field(default=120, gt=0)
    failure_timeout_seconds: float = Field(default=60, gt=0)
    startup_recovery_timeout_seconds: float = Field(default=120, gt=0)
    ocr_processing_timeout_seconds: float = Field(default=7200, gt=0)
    correction_processing_timeout_seconds: float = Field(default=14400, gt=0)
    index_processing_timeout_seconds: float = Field(default=3600, gt=0)
    worker_id: str | None = Field(default=None, min_length=1)
    worker_queues: str = "ocr"
    orphan_cleanup_enabled: bool = False
    orphan_cleanup_grace_seconds: float = Field(default=86400.0, ge=0)
    orphan_cleanup_interval_seconds: float = Field(default=3600.0, gt=0)
    orphan_cleanup_dry_run: bool = True
    websocket_heartbeat_seconds: float = Field(default=20.0, ge=1)
    # Until the wider application supplies user authentication, deployments can
    # require this bearer token for WebSocket subscriptions.
    websocket_auth_token: str | None = None
    metrics_port: int | None = Field(default=None, ge=1, le=65535)
    rabbitmq_url: str = "amqp://knowledge:knowledge@localhost:5672/knowledge"
    job_replay_batch_size: int = Field(default=100, ge=1)

    model_config = SettingsConfigDict(env_file=".env", env_prefix="KNOWLEDGE_", extra="ignore")

    @field_validator("metrics_port", mode="before")
    @classmethod
    def blank_metrics_port_is_none(cls, value: object) -> object:
        """Allow an intentionally empty optional environment setting."""

        return None if isinstance(value, str) and not value.strip() else value

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
        return self


@lru_cache
def get_settings() -> Settings:
    """Return one settings instance for the process."""

    return Settings()
