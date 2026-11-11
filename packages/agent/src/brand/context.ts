import { z } from "zod";

/** Everything the agent knows about a brand, loaded fresh for every turn. */
export const BrandContext = z.object({
  businessName: z.string().min(1),
  category: z.string().nullish(),
  city: z.string().nullish(),
  audience: z.string().nullish(),
  goals: z.array(z.string()).default([]),
  tone: z.string().nullish(),
  colours: z.object({
    primary: z.string(),
    secondary: z.string().nullish(),
    accent: z.string().nullish(),
  }),
  fonts: z.object({ heading: z.string().nullish(), body: z.string().nullish() }),
  hasLogo: z.boolean(),
  voice: z.string().nullish(),
  bannedWords: z.array(z.string()).default([]),
  recentPosts: z
    .array(
      z.object({
        type: z.string(),
        status: z.string(),
        caption: z.string().nullish(),
        createdAt: z.string(),
      }),
    )
    .max(5)
    .default([]),
});
export type BrandContext = z.infer<typeof BrandContext>;

/** Where brand context comes from (Supabase in the web app, fixtures in tests). */
export interface BrandContextSource {
  load(): Promise<BrandContext>;
}

/** Validate whatever the source returns, so a bad row can't reach the prompt. */
export async function loadBrandContext(source: BrandContextSource): Promise<BrandContext> {
  return BrandContext.parse(await source.load());
}

const line = (label: string, value: string | null | undefined) =>
  value && value.trim() ? `- ${label}: ${value.trim()}` : null;

/** Compact, prompt-ready brand brief. */
export function renderBrandContext(ctx: BrandContext): string {
  const lines = [
    `Business: ${ctx.businessName}${ctx.category ? ` (${ctx.category})` : ""}${ctx.city ? `, ${ctx.city}` : ""}`,
    line("Audience", ctx.audience),
    line("Goals", ctx.goals.join("; ")),
    line("Tone", ctx.tone),
    line("Voice notes", ctx.voice),
    line(
      "Colours",
      [
        `primary ${ctx.colours.primary}`,
        ctx.colours.secondary && `secondary ${ctx.colours.secondary}`,
        ctx.colours.accent && `accent ${ctx.colours.accent}`,
      ]
        .filter(Boolean)
        .join(", "),
    ),
    line(
      "Fonts",
      [
        ctx.fonts.heading && `headings ${ctx.fonts.heading}`,
        ctx.fonts.body && `body ${ctx.fonts.body}`,
      ]
        .filter(Boolean)
        .join(", "),
    ),
    `- Logo: ${ctx.hasLogo ? "uploaded" : "not uploaded yet"}`,
    line("Never use these words", ctx.bannedWords.join(", ")),
  ].filter(Boolean);

  if (ctx.recentPosts.length > 0) {
    lines.push("Recent posts (newest first):");
    for (const p of ctx.recentPosts) {
      const caption = p.caption
        ? ` "${p.caption.slice(0, 140)}${p.caption.length > 140 ? "…" : ""}"`
        : "";
      lines.push(`- ${p.createdAt.slice(0, 10)} ${p.type} (${p.status})${caption}`);
    }
  } else {
    lines.push("No posts yet: this may be their first.");
  }
  return lines.join("\n");
}
