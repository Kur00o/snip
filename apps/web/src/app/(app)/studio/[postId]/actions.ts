"use server";

import { SlideRecord } from "@snip/agent";
import { refresh } from "next/cache";
import { z } from "zod";
import { normaliseHashtag } from "@snip/agent";
import { requireBusiness } from "@/lib/auth";
import { enqueueRender, loadCarousel, renderedImageUrls, writeSlides } from "@/lib/carousel";
import { createClient } from "@/lib/supabase/server";

export type StudioResult = { ok: true } | { ok: false; error: string };

const PostId = z.uuid();

async function ownedCarousel(postId: unknown) {
  const business = await requireBusiness();
  const id = PostId.parse(postId);
  const db = await createClient();
  const loaded = await loadCarousel(db, id); // RLS: only the owner's posts are visible
  if (!loaded) throw new Error("Carousel not found.");
  return { business, db, id, loaded };
}

/** Autosave from the studio. Rendered PNGs become stale until the next render. */
export async function saveSlidesAction(postId: string, slides: unknown): Promise<StudioResult> {
  const parsed = z.array(SlideRecord).min(1).max(10).safeParse(slides);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid slides" };
  try {
    const { business, db, id } = await ownedCarousel(postId);
    await writeSlides(db, business.id, id, parsed.data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save." };
  }
}

const CaptionInput = z.object({
  caption: z.string().max(2200, "Instagram captions max out at 2,200 characters"),
  hashtags: z.array(z.string()).max(30),
});

export async function saveCaptionAction(postId: string, input: unknown): Promise<StudioResult> {
  const parsed = CaptionInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid caption" };
  try {
    const { db, id } = await ownedCarousel(postId);
    const hashtags = [
      ...new Set(parsed.data.hashtags.map(normaliseHashtag).filter((t): t is string => Boolean(t))),
    ];
    const { error } = await db
      .from("posts")
      .update({ caption: parsed.data.caption.trim() || null, hashtags })
      .eq("id", id);
    if (error) return { ok: false, error: "Couldn't save the caption." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save." };
  }
}

export async function renderAction(postId: string): Promise<StudioResult> {
  try {
    const { business, db, id } = await ownedCarousel(postId);
    await enqueueRender(db, business, id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start rendering." };
  }
}

export async function approveAction(postId: string): Promise<StudioResult> {
  try {
    const { business, db, id, loaded } = await ownedCarousel(postId);
    const { error } = await db.from("posts").update({ status: "approved" }).eq("id", id);
    if (error) return { ok: false, error: "Couldn't approve the post." };
    if (loaded.rows.some((r) => !r.image_path)) await enqueueRender(db, business, id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't approve." };
  }
}

export type RenderState = {
  job: { status: string; error: string | null; createdAt: string } | null;
  rendered: number;
  total: number;
  images: Record<number, string>;
  postStatus: string;
};

/** Polled by the studio while a render is queued or running. */
export async function getRenderState(postId: string): Promise<RenderState> {
  const { db, id, loaded } = await ownedCarousel(postId);
  const { data: job } = await db
    .from("jobs")
    .select("status, error, created_at")
    .eq("kind", "render_carousel")
    .eq("payload->>postId", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    job: job ? { status: job.status, error: job.error, createdAt: job.created_at } : null,
    rendered: loaded.rows.filter((r) => r.image_path).length,
    total: loaded.rows.length,
    images: await renderedImageUrls(db, loaded.rows),
    postStatus: loaded.post.status,
  };
}
