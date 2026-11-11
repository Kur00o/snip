import "server-only";

import {
  LlmRouter,
  providersFromEnv,
  type BrandContext,
  type BrandContextSource,
} from "@snip/agent";
import type { Database } from "@snip/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Business } from "@/lib/auth";
import { goalsFromText } from "@/lib/validation/business";

let router: LlmRouter | undefined;

/** The one LLM router for this server instance. Keys come from env, never the browser. */
export function getRouter(): LlmRouter {
  router ??= new LlmRouter({
    providers: providersFromEnv(process.env),
    onAttemptFailed: (a) => console.warn(`[llm] ${a.provider}/${a.model} failed: ${a.error}`),
  });
  return router;
}

/** Brand context loader: business profile, brand kit and the last few posts. */
export function supabaseBrandSource(
  supabase: SupabaseClient<Database>,
  business: Business,
): BrandContextSource {
  return {
    async load(): Promise<BrandContext> {
      const [kit, posts] = await Promise.all([
        supabase.from("brand_kits").select("*").eq("business_id", business.id).maybeSingle(),
        supabase
          .from("posts")
          .select("type, status, caption, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const k = kit.data;
      const extra = (k?.extra ?? {}) as { voice?: unknown; banned_words?: unknown };
      return {
        businessName: business.name,
        category: business.category,
        city: business.city,
        audience: business.target_audience,
        goals: goalsFromText(business.goals),
        tone: business.tone,
        colours: {
          primary: k?.primary_color ?? "#0F9D8F",
          secondary: k?.secondary_color,
          accent: k?.accent_color,
        },
        fonts: { heading: k?.heading_font, body: k?.body_font },
        hasLogo: Boolean(k?.logo_path),
        voice: typeof extra.voice === "string" ? extra.voice : null,
        bannedWords: Array.isArray(extra.banned_words)
          ? extra.banned_words.filter((w): w is string => typeof w === "string")
          : [],
        recentPosts: (posts.data ?? []).map((p) => ({
          type: p.type,
          status: p.status,
          caption: p.caption,
          createdAt: p.created_at,
        })),
      };
    },
  };
}
