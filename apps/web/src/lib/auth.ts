import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { Tables } from "@snip/db";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer: the only place pages read "who is this?". Every helper re-checks
 * the session itself, so a page can never render someone else's data by mistake.
 * `cache` dedupes calls within one request.
 */

export type SessionUser = { id: string; email: string | null; name: string | null };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null, name };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export type Business = Tables<"businesses">;

/** The user's business (one per user for now; the schema allows more later). */
export const getMyBusiness = cache(async (): Promise<Business | null> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load your business: ${error.message}`);
  return data;
});

/** For app pages: a finished onboarding is required, otherwise go and finish it. */
export async function requireBusiness(): Promise<Business> {
  const business = await getMyBusiness();
  if (!business || !business.onboarding_done) redirect("/onboarding");
  return business;
}
