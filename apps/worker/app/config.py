"""Worker settings, read from environment variables (or apps/worker/.env)."""

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = Field(default="", description="https://<ref>.supabase.co")
    supabase_secret_key: SecretStr = Field(
        default=SecretStr(""),
        description="Supabase secret (service role) key. Worker-only; never expose to the browser.",
    )
    worker_id: str = Field(default="laptop-1", description="Name recorded on claimed jobs.")
    poll_interval_sec: float = Field(default=5.0, gt=0)
    job_kinds: list[str] = Field(
        default=["render_carousel", "edit_reel", "transcribe"],
        description="Job kinds this worker will claim. 'publish' runs in a Supabase Edge Function.",
    )

    @property
    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_secret_key.get_secret_value())


@lru_cache
def get_settings() -> Settings:
    return Settings()
