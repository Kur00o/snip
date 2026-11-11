"""Snip render worker.

Run it on a laptop or Colab: it claims render jobs from Supabase, screenshots slide HTML
with Playwright and uploads PNGs. The HTTP API is for health checks.

    uv run uvicorn app.main:app --port 8000      # API + poller
    uv run python -m app.cli                      # poller only
"""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from app.config import get_settings
from app.poller import Poller
from app.render import PlaywrightRenderer
from app.supabase import SupabaseClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("snip.worker")

state: dict[str, Poller] = {}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    task: asyncio.Task[None] | None = None
    if settings.is_configured and settings.run_poller:
        db = SupabaseClient(settings.supabase_url, settings.supabase_secret_key.get_secret_value())
        renderer = PlaywrightRenderer(settings.chromium_path)
        poller = Poller(db, renderer, settings.job_kinds, settings.poll_interval_sec)
        state["poller"] = poller
        task = asyncio.create_task(poller.run_forever())
    else:
        log.warning("Poller off: set SUPABASE_URL and SUPABASE_SECRET_KEY in apps/worker/.env.")
    try:
        yield
    finally:
        running = state.pop("poller", None) if "poller" in state else None
        if running and task:
            running.stop()
            await task
            if isinstance(running.renderer, PlaywrightRenderer):
                await running.renderer.stop()
            await running.db.close()


app = FastAPI(title="Snip worker", version="0.2.0", lifespan=lifespan)


class Health(BaseModel):
    ok: bool
    service: str
    worker_id: str
    supabase_configured: bool
    job_kinds: list[str]
    poller_running: bool
    jobs_done: int
    jobs_failed: int
    last_error: str | None


@app.get("/health")
def health() -> Health:
    settings = get_settings()
    poller = state.get("poller")
    status = poller.status if poller else None
    return Health(
        ok=True,
        service="snip-worker",
        worker_id=settings.worker_id,
        supabase_configured=settings.is_configured,
        job_kinds=settings.job_kinds,
        poller_running=bool(status and status.running),
        jobs_done=status.jobs_done if status else 0,
        jobs_failed=status.jobs_failed if status else 0,
        last_error=status.last_error if status else None,
    )
