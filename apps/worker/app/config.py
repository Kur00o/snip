"""Worker settings, read from environment variables (or apps/worker/.env)."""

from functools import lru_cache

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
        description="https://<ref>.supabase.co",
    )
    supabase_secret_key: SecretStr = Field(
        default=SecretStr(""),
        description="Supabase secret (service role) key. Worker only; never expose it.",
    )
    worker_id: str = Field(default="laptop-1", description="Shown in logs and /health.")
    poll_interval_sec: float = Field(default=3.0, gt=0)
    job_kinds: list[str] = Field(
        default=["render_carousel"],
        description="Job kinds to claim. Reel kinds come in Phase 8; publish is an Edge Function.",
    )
    run_poller: bool = Field(default=True, description="Start the job poller with the API.")
    chromium_path: str | None = Field(
        default=None,
        description="Optional path to an installed Chrome/Chromium (skips `playwright install`).",
    )

    @property
    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_secret_key.get_secret_value())


@lru_cache
def get_settings() -> Settings:
    return Settings()
