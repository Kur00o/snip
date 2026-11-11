"use server";

import { refresh } from "next/cache";
import { BUCKETS, businessPath, type Json } from "@snip/db";
import { requireBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BrandKitInput, LOGO_TYPES, LogoUploadRequest } from "@/lib/validation/brand-kit";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Save colours, fonts and voice. Logo has its own flow below. */
export async function saveBrandKit(input: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = BrandKitInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("brand_kits")
    .select("extra")
    .eq("business_id", business.id)
    .single();
  if (readError) return { ok: false, error: "We couldn't load your brand kit." };

  const k = parsed.data;
  const extra = {
    ...(isObject(current.extra) ? current.extra : {}),
    voice: k.voice,
    banned_words: k.bannedWords,
  } satisfies Record<string, Json | undefined>;

  const { error } = await supabase
    .from("brand_kits")
    .update({
      primary_color: k.primaryColor,
      secondary_color: k.secondaryColor,
      accent_color: k.accentColor,
      heading_font: k.headingFont,
      body_font: k.bodyFont,
      extra,
    })
    .eq("business_id", business.id);
  if (error) return { ok: false, error: "We couldn't save your brand kit. Please try again." };

  refresh();
  return { ok: true };
}

export type UploadTicket = { ok: true; path: string; token: string } | { ok: false; error: string };

/** Step 1 of a logo upload: a short-lived signed URL for <business_id>/logo-<time>.<ext>. */
export async function createLogoUpload(input: unknown): Promise<UploadTicket> {
  const business = await requireBusiness();
  const parsed = LogoUploadRequest.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file" };

  const ext = LOGO_TYPES[parsed.data.contentType];
  const path = businessPath(business.id, `logo-${Date.now()}.${ext}`);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKETS.brandAssets)
    .createSignedUploadUrl(path);
  if (error || !data)
    return { ok: false, error: "We couldn't start the upload. Please try again." };
  return { ok: true, path: data.path, token: data.token };
}

/** Step 2: point the brand kit at the uploaded file and remove the old logo. */
export async function saveLogo(input: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = LogoUploadRequest.safeParse(input);
  const path = isObject(input) && typeof input.path === "string" ? input.path : "";
  const pattern = new RegExp(`^${business.id}/logo-\\d+\\.(png|jpg|webp)$`);
  if (!parsed.success || !pattern.test(path))
    return { ok: false, error: "That upload isn't valid." };

  const supabase = await createClient();
  const { data: kit } = await supabase
    .from("brand_kits")
    .select("logo_path")
    .eq("business_id", business.id)
    .single();

  const { error } = await supabase
    .from("brand_kits")
    .update({ logo_path: path })
    .eq("business_id", business.id);
  if (error) return { ok: false, error: "We couldn't save your logo. Please try again." };

  await supabase.from("assets").insert({
    business_id: business.id,
    kind: "logo",
    storage_path: path,
    mime_type: parsed.data.contentType,
    size_bytes: parsed.data.size,
  });

  const old = kit?.logo_path;
  if (old && old !== path) {
    await supabase.storage.from(BUCKETS.brandAssets).remove([old]);
    await supabase.from("assets").delete().eq("storage_path", old);
  }

  refresh();
  return { ok: true };
}

function isObject(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
