"""
Central application configuration using pydantic-settings.
All values are read from environment variables (or .env file).
No secrets are hardcoded here.
"""
from functools import lru_cache
from typing import Any

from pydantic import computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────
    app_env: str = "development"
    debug: bool = False
    app_name: str = "ShopForge"
    app_version: str = "1.0.0"
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # ── Security ─────────────────────────────────────────────────
    secret_key: str = "CHANGE_ME"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # ── Database ─────────────────────────────────────────────────
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "shopforge"
    postgres_user: str = "shopforge_user"
    postgres_password: str = "password"

    @computed_field  # type: ignore[misc]
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field  # type: ignore[misc]
    @property
    def database_url_sync(self) -> str:
        """Sync URL used by Alembic migrations."""
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Redis ────────────────────────────────────────────────────
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0

    @computed_field  # type: ignore[misc]
    @property
    def redis_url(self) -> str:
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # ── Stripe ───────────────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # ── Email ────────────────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from_name: str = "ShopForge"
    email_from_address: str = "noreply@shopforge.com"

    # ── AWS / S3 ─────────────────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket_name: str = ""
    s3_endpoint_url: str = ""  # empty = use AWS S3; set for MinIO/R2/DO Spaces

    # ── Twilio (SMS OTP) ─────────────────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # ── Rate Limiting ────────────────────────────────────────────
    rate_limit_auth_per_minute: int = 5
    rate_limit_api_per_minute: int = 100

    # ── CORS ─────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    @computed_field  # type: ignore[misc]
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Logging ──────────────────────────────────────────────────
    log_level: str = "INFO"

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Fail fast if dangerous defaults reach production."""
        if self.app_env == "production":
            assert self.secret_key != "CHANGE_ME", (
                "SECRET_KEY must be set in production"
            )
            assert self.stripe_secret_key.startswith("sk_live_"), (
                "Use live Stripe keys in production"
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_testing(self) -> bool:
        return self.app_env == "test"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere instead of instantiating directly."""
    return Settings()


settings = get_settings()
