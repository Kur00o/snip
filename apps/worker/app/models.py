"""Pydantic models for jobs claimed from Supabase. Everything the worker reads is validated."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

JobKind = Literal["render_carousel", "edit_reel", "transcribe", "publish"]


class Job(BaseModel):
    """A row from public.jobs as returned by the claim_job RPC."""

    model_config = ConfigDict(extra="ignore")

    id: str
    business_id: str
    kind: JobKind
    payload: dict[str, object]
    status: str
    attempts: int


class SlideToRender(BaseModel):
    slide_id: str = Field(alias="slideId", min_length=1)
    position: int = Field(ge=0, le=9)
    html: str = Field(min_length=20, max_length=200_000)


class RenderCarouselPayload(BaseModel):
    """Payload written by apps/web (lib/carousel.ts → enqueueRender)."""

    post_id: str = Field(alias="postId", min_length=1)
    slides: list[SlideToRender] = Field(min_length=1, max_length=10)


class RenderResult(BaseModel):
    post_id: str
    rendered: list[str]
    skipped: list[str]
