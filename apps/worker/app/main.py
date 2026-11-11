"""Snip render worker HTTP surface.

The worker mostly runs a background poller (added in Phase 5) that claims jobs with
`SELECT ... FOR UPDATE SKIP LOCKED`. The HTTP API is for health checks and local debugging.
"""

from fastapi import FastAPI
from pydantic import BaseModel

from app.config import get_settings

app = FastAPI(title="Snip worker", version="0.1.0")


class Health(BaseModel):
    ok: bool
    service: str
    worker_id: str
    supabase_configured: bool
    job_kinds: list[str]


@app.get("/health")
def health() -> Health:
    settings = get_settings()
    return Health(
        ok=True,
        service="snip-worker",
        worker_id=settings.worker_id,
        supabase_configured=settings.is_configured,
        job_kinds=settings.job_kinds,
    )
