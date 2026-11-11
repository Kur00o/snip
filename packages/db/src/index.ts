import { z } from "zod";

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./database.types";

/*
 * Status vocabularies. These mirror the CHECK constraints in supabase/migrations, so the
 * app, the agent and the Edge Functions agree on every allowed value.
 */
export const Platform = z.enum(["instagram", "facebook", "youtube"]);
export type Platform = z.infer<typeof Platform>;

export const SocialAccountStatus = z.enum(["active", "expired", "revoked"]);
export type SocialAccountStatus = z.infer<typeof SocialAccountStatus>;

export const PostType = z.enum(["carousel", "reel", "single", "short"]);
export type PostType = z.infer<typeof PostType>;

export const PostStatus = z.enum([
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "failed",
]);
export type PostStatus = z.infer<typeof PostStatus>;

export const ScheduleStatus = z.enum(["pending", "publishing", "done", "failed"]);
export type ScheduleStatus = z.infer<typeof ScheduleStatus>;

export const JobKind = z.enum(["render_carousel", "edit_reel", "transcribe", "publish"]);
export type JobKind = z.infer<typeof JobKind>;

export const JobStatus = z.enum(["pending", "running", "done", "failed"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const MessageRole = z.enum(["user", "assistant", "tool"]);
export type MessageRole = z.infer<typeof MessageRole>;

export const TemplateKind = z.enum(["carousel", "reel", "thumbnail"]);
export type TemplateKind = z.infer<typeof TemplateKind>;

export const AssetKind = z.enum(["logo", "photo", "clip", "render"]);
export type AssetKind = z.infer<typeof AssetKind>;

/* Storage. Every object lives under its business's folder: <business_id>/<...path>. */
export const BUCKETS = {
  brandAssets: "brand-assets",
  clips: "clips",
  renders: "renders",
  templates: "templates",
} as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Free-tier per-file limit (bytes). Mirrors the bucket settings. */
export const MAX_UPLOAD_BYTES: Record<Bucket, number> = {
  "brand-assets": 10 * 1024 * 1024,
  clips: 50 * 1024 * 1024,
  renders: 50 * 1024 * 1024,
  templates: 2 * 1024 * 1024,
};

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * Build a storage path inside a business's folder, e.g.
 * businessPath(id, "reels", reelId, "take-1.mp4") → "<id>/reels/<reelId>/take-1.mp4".
 * Rejects empty, "." / ".." and unsafe segments so a path can never escape its folder.
 */
export function businessPath(businessId: string, ...segments: string[]): string {
  z.uuid().parse(businessId);
  if (segments.length === 0) throw new Error("businessPath needs at least one segment");
  for (const segment of segments) {
    if (!SAFE_SEGMENT.test(segment) || segment === "." || segment === "..") {
      throw new Error(`unsafe storage path segment: ${JSON.stringify(segment)}`);
    }
  }
  return [businessId, ...segments].join("/");
}
