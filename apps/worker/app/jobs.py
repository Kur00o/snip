"""Job handlers. Each one does the media work and writes results back to Supabase."""

import logging
import time

from app.models import Job, RenderCarouselPayload, RenderResult
from app.render import SlideRenderer
from app.supabase import SupabaseClient

log = logging.getLogger("snip.worker")

RENDERS_BUCKET = "renders"


def slide_path(business_id: str, post_id: str, position: int, stamp: int) -> str:
    """Storage path inside the business's folder (RLS lets the owner read it)."""
    return f"{business_id}/posts/{post_id}/slide-{position + 1:02d}-{stamp}.png"


async def render_carousel(
    job: Job, db: SupabaseClient, renderer: SlideRenderer, now: int | None = None
) -> RenderResult:
    payload = RenderCarouselPayload.model_validate(job.payload)
    stamp = now or int(time.time())

    current = await db.select(
        "slides",
        {
            "select": "id,image_path",
            "post_id": f"eq.{payload.post_id}",
            "business_id": f"eq.{job.business_id}",
        },
    )
    existing = {row["id"]: row.get("image_path") for row in current}

    rendered: list[str] = []
    skipped: list[str] = []
    stale: list[str] = []
    for slide in payload.slides:
        if slide.slide_id not in existing:
            # The user changed the carousel after this job was queued; a newer job covers it.
            skipped.append(slide.slide_id)
            continue
        png = await renderer.render(slide.html)
        path = slide_path(job.business_id, payload.post_id, slide.position, stamp)
        await db.upload(RENDERS_BUCKET, path, png, "image/png")
        await db.update(
            "slides",
            {"id": f"eq.{slide.slide_id}", "post_id": f"eq.{payload.post_id}"},
            {"image_path": path},
        )
        old = existing.get(slide.slide_id)
        if old and old != path:
            stale.append(old)
        rendered.append(slide.slide_id)
        log.info("rendered slide %s of post %s", slide.position + 1, payload.post_id)

    # Free-tier storage is 1 GB: drop the previous renders of these slides.
    if stale:
        try:
            await db.remove(RENDERS_BUCKET, stale)
        except Exception:  # cleanup must never fail the job
            log.warning("could not remove old renders for post %s", payload.post_id)

    if rendered:
        await db.update(
            "posts",
            {"id": f"eq.{payload.post_id}", "status": "eq.draft"},
            {"status": "review"},
        )
    return RenderResult(post_id=payload.post_id, rendered=rendered, skipped=skipped)
