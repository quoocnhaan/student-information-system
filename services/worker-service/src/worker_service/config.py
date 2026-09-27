"""Worker environment without database or object-store credentials."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    rabbitmq_url: str = "amqp://guest:guest@localhost/"
    job_service_url: str = "http://localhost:8010"
    job_token: str = ""
    knowledge_url: str = "http://localhost:8000"
    knowledge_token: str = ""
    lmstudio_base_url: str = "http://localhost:1234/v1"
    lmstudio_ocr_model: str = "lightonocr-2-1b"
    ocr_max_pages: int = Field(default=100, ge=1)
    ocr_max_output_tokens: int = Field(default=4096, ge=1)
    ocr_timeout_seconds: float = Field(default=60, gt=0)
    enabled_handlers: str = "knowledge:ocr_pdf"

    model_config = SettingsConfigDict(env_prefix="WORKER_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.job_token or not settings.knowledge_token:
        raise ValueError("WORKER_JOB_TOKEN and WORKER_KNOWLEDGE_TOKEN are required")
    return settings
