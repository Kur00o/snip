import "server-only";

import {
  SlideRecord,
  type AgentServices,
  type CarouselDraft,
  type CarouselSnapshot,
} from "@snip/agent";
import { BUCKETS, type Database, type Json, type Tables } from "@snip/db";
import { CarouselTemplateId, SLIDE_THEMES, renderSlide, type SlideBrand } from "@snip/templates";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Business } from "@/lib/auth";

type Db = SupabaseClient<Database>;
type SlideRow = Pick<
  Tables<"slides">,
  "id" | "position" | "headline" | "body" | "layout" | "image_path"
>;

/** A slides row → the shape the agent and studio edit. Unknown layouts fall back safely. */
export function rowToSlide(row: Pick<SlideRow, "headline" | "body" | "layout">): SlideRecord {
  const layout = (row.layout ?? {}) as { template?: unknown; theme?: unknown; slots?: unknown };
  const template = CarouselTemplateId.safeParse(layout.template);
  const theme = (SLIDE_THEMES as readonly string[]).includes(String(layout.theme))
    ? (layout.theme as SlideRecord["theme"])
    : "primary";
  const slots: Record<string, string> = {};
  if (layout.slots && typeof layout.slots === "object") {
    for (const [k, v] of Object.entries(layout.slots)) if (typeof v === "string") slots[k] = v;
  }
  return SlideRecord.parse({
    template: template.success ? template.data : "bold-statement",
    theme,
    headline: row.headline ?? "",
    body: row.body ?? "",
    slots,
  });
}

function slideToRow(slide: SlideRecord) {
  return {
    headline: slide.headline,
    body: slide.body,
    layout: { template: slide.template, theme: slide.theme, slots: slide.slots } as Json,
  };
}

/** Brand values for slide HTML, with a logo URL that stays valid long enough to render. */
export async function slideBrandFor(db: Db, business: Business): Promise<SlideBrand> {
  const { data: kit } = await db
    .from("brand_kits")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();
  let logoUrl: string | null = null;
  if (kit?.logo_path) {
    const { data } = await db.storage
      .from(BUCKETS.brandAssets)
      .createSignedUrl(kit.logo_path, 6 * 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }
  const { data: ig } = await db
    .from("social_accounts")
    .select("handle")
    .eq("business_id", business.id)
    .eq("platform", "instagram")
    .eq("status", "active")
    .maybeSingle();
  return {
    businessName: business.name,
    handle: ig?.handle ?? null,
    primary: kit?.primary_color ?? "#0F9D8F",
    secondary: kit?.secondary_color ?? null,
    accent: kit?.accent_color ?? null,
    headingFont: kit?.heading_font ?? null,
    bodyFont: kit?.body_font ?? null,
    logoUrl,
  };
}

export async function loadCarousel(db: Db, postId: string) {
  const { data: post } = await db
    .from("posts")
    .select(
      "id, business_id, conversation_id, type, status, caption, hashtags, brief, created_at, updated_at",
    )
    .eq("id", postId)
    .eq("type", "carousel")
    .maybeSingle();
  if (!post) return null;
  const { data: rows } = await db
    .from("slides")
    .select("id, position, headline, body, layout, image_path")
    .eq("post_id", postId)
    .order("position", { ascending: true });
  return { post, rows: rows ?? [] };
}

/** Title for a carousel: its cover headline. */
export function carouselTitle(rows: Pick<SlideRow, "headline">[]): string {
  return rows[0]?.headline?.trim() || "Untitled carousel";
}

/**
 * Replace a carousel's slides without ever leaving it empty: update rows in place by
 * position, add new ones, then remove extras. Clears rendered images (they're now stale).
 */
export async function writeSlides(
  db: Db,
  businessId: string,
  postId: string,
  slides: SlideRecord[],
) {
  const { data: existing } = await db
    .from("slides")
    .select("id, position")
    .eq("post_id", postId)
    .order("position", { ascending: true });
  const current = existing ?? [];

  for (const [i, slide] of slides.entries()) {
    const row = { ...slideToRow(slide), image_path: null };
    const match = current[i];
    const { error } = match
      ? await db
          .from("slides")
          .update({ ...row, position: i })
          .eq("id", match.id)
      : await db
          .from("slides")
          .insert({ ...row, post_id: postId, business_id: businessId, position: i });
    if (error) throw new Error(`Couldn't save slide ${i + 1}: ${error.message}`);
  }
  if (current.length > slides.length) {
    const extra = current.slice(slides.length).map((r) => r.id);
    await db.from("slides").delete().in("id", extra);
  }
  await db.from("posts").update({ updated_at: new Date().toISOString() }).eq("id", postId);
}

/** Queue a render_carousel job with fully rendered HTML, so the worker only screenshots. */
export async function enqueueRender(db: Db, business: Business, postId: string) {
  const loaded = await loadCarousel(db, postId);
  if (!loaded || loaded.rows.length === 0) return null;
  const brand = await slideBrandFor(db, business);
  const total = loaded.rows.length;
  const payload = {
    postId,
    slides: loaded.rows.map((row, index) => ({
      slideId: row.id,
      position: row.position,
      html: renderSlide({ slide: rowToSlide(row), brand, index, total }),
    })),
  };
  const { data, error } = await db
    .from("jobs")
    .insert({
      business_id: business.id,
      kind: "render_carousel",
      payload: payload as unknown as Json,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Couldn't queue the render: ${error.message}`);
  return data.id;
}

/** AgentServices backed by Supabase, scoped by RLS to the signed-in user's business. */
export function supabaseAgentServices(
  db: Db,
  business: Business,
  conversationId: string | null,
): AgentServices {
  return {
    async createCarousel(draft: CarouselDraft) {
      const { data: template } = await db
        .from("templates")
        .select("id")
        .eq("is_system", true)
        .eq("html_path", `system/carousel/${draft.slides[0]?.template ?? "bold-statement"}.html`)
        .maybeSingle();
      const { data: post, error } = await db
        .from("posts")
        .insert({
          business_id: business.id,
          conversation_id: conversationId,
          template_id: template?.id ?? null,
          type: "carousel",
          status: "draft",
          brief: draft.brief,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Couldn't save the carousel: ${error.message}`);
      await writeSlides(db, business.id, post.id, draft.slides);
      await enqueueRender(db, business, post.id);
      return { postId: post.id };
    },

    async getCarousel(postId): Promise<CarouselSnapshot | null> {
      const loaded = await loadCarousel(db, postId);
      if (!loaded) return null;
      return {
        postId,
        title: carouselTitle(loaded.rows),
        caption: loaded.post.caption,
        hashtags: loaded.post.hashtags,
        slides: loaded.rows.map(rowToSlide),
      };
    },

    async updateSlides(postId, slides) {
      await writeSlides(db, business.id, postId, slides);
      await enqueueRender(db, business, postId);
    },

    async saveCaption(postId, caption, hashtags) {
      const { error } = await db.from("posts").update({ caption, hashtags }).eq("id", postId);
      if (error) throw new Error(`Couldn't save the caption: ${error.message}`);
    },
  };
}

/** Signed URLs for rendered slide PNGs (1 hour). */
export async function renderedImageUrls(db: Db, rows: Pick<SlideRow, "position" | "image_path">[]) {
  const paths = rows.map((r) => r.image_path).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return {} as Record<number, string>;
  const { data } = await db.storage.from(BUCKETS.renders).createSignedUrls(paths, 60 * 60);
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  const out: Record<number, string> = {};
  for (const r of rows) {
    const url = r.image_path ? byPath.get(r.image_path) : undefined;
    if (url) out[r.position] = url;
  }
  return out;
}
