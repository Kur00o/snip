import "server-only";

import { headers } from "next/headers";

/**
 * The site's own origin, for OAuth and email redirect URLs. Prefers the request's origin
 * (so localhost and Vercel previews both work) and falls back to NEXT_PUBLIC_SITE_URL.
 * The URL must also be listed under Supabase → Authentication → URL Configuration.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
