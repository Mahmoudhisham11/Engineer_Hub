"""Application configuration using Pydantic Settings."""

import os
from functools import lru_cache
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "EngineerHub"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./data/engineerhub.db"

    # SQLite Concurrency & Tuning
    SQLITE_TIMEOUT_SECONDS: int = 15
    SQLITE_BUSY_TIMEOUT_MS: int = 10000

    # JWT Authentication
    JWT_SECRET_KEY: str = "engineerhub-super-secret-jwt-token-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Business Rules
    MAX_DAILY_WORK_HOURS: float = 24.0
    # Default non-working days: 4=Friday, 5=Saturday (0=Monday, 6=Sunday)
    NON_WORKING_DAYS: str = "4,5"

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://127.0.0.1:3000,app://-,file://"

    # Seed Admin Account
    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_EMAIL: str = "admin@dme.internal"
    INITIAL_ADMIN_PASSWORD: str = "AdminSecurePassword123!"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000"]

    @property
    def non_working_weekdays(self) -> List[int]:
        """Return list of integer weekdays that are non-working."""
        if not self.NON_WORKING_DAYS:
            return [4, 5]
        try:
            return [int(x.strip()) for x in self.NON_WORKING_DAYS.split(",") if x.strip()]
        except ValueError:
            return [4, 5]


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()


settings = get_settings()
