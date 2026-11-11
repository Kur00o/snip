import type { Metadata } from "next";
import { Suspense } from "react";
import { BUCKETS } from "@snip/db";
import { BrandKitForm, type BrandKitFormValues } from "@/components/brand/brand-kit-form";
import { PageHeader } from "@/components/page-header";
import { requireBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createLogoUpload, saveBrandKit, saveLogo } from "./actions";

export const metadata: Metadata = { title: "Brand kit" };

export default function BrandPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Brand kit"
        lead="Snip uses these for every slide, caption and Reel it makes for you."
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" />}
      >
        <BrandKit />
      </Suspense>
    </div>
  );
}

async function BrandKit() {
  const business = await requireBusiness();
  const supabase = await createClient();
  const { data: kit, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("business_id", business.id)
    .single();
  if (error) throw new Error("Could not load your brand kit.");

  let logoUrl: string | null = null;
  if (kit.logo_path) {
    const { data } = await supabase.storage
      .from(BUCKETS.brandAssets)
      .createSignedUrl(kit.logo_path, 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }

  const extra = (kit.extra ?? {}) as { voice?: unknown; banned_words?: unknown };
  const initial: BrandKitFormValues = {
    primaryColor: kit.primary_color,
    secondaryColor: kit.secondary_color ?? "",
    accentColor: kit.accent_color ?? "",
    headingFont: kit.heading_font ?? "",
    bodyFont: kit.body_font ?? "",
    voice: typeof extra.voice === "string" ? extra.voice : "",
    bannedWords: Array.isArray(extra.banned_words) ? extra.banned_words.join(", ") : "",
  };

  return (
    <BrandKitForm
      businessName={business.name}
      initial={initial}
      logoUrl={logoUrl}
      save={saveBrandKit}
      createUpload={createLogoUpload}
      saveLogo={saveLogo}
    />
  );
}
