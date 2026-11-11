"""The job loop: claim (FOR UPDATE SKIP LOCKED via claim_job), run, complete."""

import asyncio
import contextlib
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime

from pydantic import ValidationError

from app.jobs import render_carousel
from app.models import Job
from app.render import SlideRenderer
from app.supabase import SupabaseClient

log = logging.getLogger("snip.worker")


@dataclass
class PollerStatus:
    running: bool = False
    jobs_done: int = 0
    jobs_failed: int = 0
    last_job_at: str | None = None
    last_error: str | None = None
    kinds: list[str] = field(default_factory=list)


class Poller:
    def __init__(
        self,
        db: SupabaseClient,
        renderer: SlideRenderer,
        kinds: list[str],
        interval_sec: float = 3.0,
    ) -> None:
        self.db = db
        self.renderer = renderer
        self.kinds = kinds
        self.interval = interval_sec
        self.status = PollerStatus(kinds=kinds)
        self._stop = asyncio.Event()

    async def claim(self) -> Job | None:
        rows = await self.db.rpc("claim_job", {"p_kinds": self.kinds})
        if not rows:
            return None
        return Job.model_validate(rows[0] if isinstance(rows, list) else rows)

    async def run_once(self) -> bool:
        """Claim and process one job. Returns False when the queue was empty."""
        job = await self.claim()
        if job is None:
            return False
        self.status.last_job_at = datetime.now(UTC).isoformat()
        try:
            if job.kind == "render_carousel":
                result = await render_carousel(job, self.db, self.renderer)
                log.info("job %s done: %d slides rendered", job.id, len(result.rendered))
            else:
                raise NotImplementedError(f"This worker can't handle {job.kind} jobs yet.")
            await self.db.rpc("complete_job", {"p_job_id": job.id})
            self.status.jobs_done += 1
        except Exception as error:
            message = _describe(error)
            log.exception("job %s failed", job.id)
            self.status.jobs_failed += 1
            self.status.last_error = message
            await self.db.rpc("complete_job", {"p_job_id": job.id, "p_error": message})
        return True

    async def run_forever(self) -> None:
        self.status.running = True
        log.info("poller started for %s", ", ".join(self.kinds))
        try:
            while not self._stop.is_set():
                try:
                    busy = await self.run_once()
                except Exception as error:  # network blips: wait and try again
                    self.status.last_error = _describe(error)
                    log.warning("poll failed: %s", self.status.last_error)
                    busy = False
                if not busy:
                    with contextlib.suppress(TimeoutError):
                        await asyncio.wait_for(self._stop.wait(), timeout=self.interval)
        finally:
            self.status.running = False

    def stop(self) -> None:
        self._stop.set()


def _describe(error: Exception) -> str:
    if isinstance(error, ValidationError):
        return f"Invalid job payload: {error.error_count()} problem(s)"
    return str(error)[:500] or error.__class__.__name__
