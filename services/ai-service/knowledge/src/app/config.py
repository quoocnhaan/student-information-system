"""Environment-backed configuration for the knowledge module."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings required by the running knowledge module."""

    environment: str = "development"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_prefix="KNOWLEDGE_")


@lru_cache
def get_settings() -> Settings:
    """Return one settings instance for the process."""

    return Settings()
