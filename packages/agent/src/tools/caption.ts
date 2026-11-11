import { z } from "zod";
import { renderBrandContext } from "../brand/context";
import { completeJson } from "../llm/json";
import { describeCarousel } from "../services";
import { defineTool } from "./define";

export const CaptionInput = z.object({
  brief: z
    .string()
    .trim()
    .min(3)
    .max(800)
    .describe("What the post is about, with any facts the user gave."),
  postId: z
    .string()
    .min(1)
    .optional()
    .describe("Save the caption on this post (from plan_carousel)."),
  platform: z.enum(["instagram", "facebook", "youtube"]).default("instagram"),
});

/** "#Pune Cafe" → "#punecafe"; drops anything that isn't a usable tag. */
export function normaliseHashtag(tag: string): string | null {
  const cleaned = tag
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .toLowerCase();
  return cleaned.length >= 2 && cleaned.length <= 40 ? `#${cleaned}` : null;
}

export function buildCaptionSchema(bannedWords: readonly string[]) {
  const banned = bannedWords.map((w) => w.toLowerCase()).filter(Boolean);
  return z
    .object({
      caption: z.string().trim().min(10).max(2200),
      hashtags: z.array(z.string()).min(5).max(15),
    })
    .transform((v) => ({
      caption: v.caption,
      hashtags: [
        ...new Set(v.hashtags.map(normaliseHashtag).filter((t): t is string => Boolean(t))),
      ].slice(0, 12),
    }))
    .refine((v) => v.hashtags.length >= 5, { message: "Give at least 5 valid hashtags" })
    .refine((v) => !banned.some((w) => v.caption.toLowerCase().includes(w)), {
      message: `The caption must not contain: ${banned.join(", ")}`,
    });
}

export const CaptionOutput = z.object({
  postId: z.string().optional(),
  caption: z.string(),
  hashtags: z.array(z.string()),
});

/** write_caption_and_hashtags: bulk text, so it routes to NVIDIA first. */
export const writeCaption = defineTool({
  name: "write_caption_and_hashtags",
  description:
    "Write the post caption and 5-12 hashtags in the brand's voice. Pass postId to save them on a carousel draft.",
  input: CaptionInput,
  output: CaptionOutput,
  async run(input, ctx) {
    const carousel = input.postId ? await ctx.services.getCarousel(input.postId) : null;
    if (input.postId && !carousel) throw new Error(`Post ${input.postId} was not found.`);

    const lengths = {
      instagram: "2-4 short lines",
      facebook: "3-5 short lines",
      youtube: "1-2 lines (Shorts)",
    };
    const result = await completeJson(ctx.llm, {
      task: "bulk_text",
      signal: ctx.signal,
      schema: buildCaptionSchema(ctx.brand.bannedWords),
      system: `You write ${input.platform} captions for a small business.

${renderBrandContext(ctx.brand)}

Caption: a hook in the first line, ${lengths[input.platform]}, one clear call to action, a fitting emoji or two at most. Match the brand's tone and voice notes. Never invent prices, dates or offers; use [placeholders].
Hashtags: 5 to 12, a mix of local (city/area) and niche tags, no spaces, no banned words.

JSON shape: {"caption": "...", "hashtags": ["#...", "#..."]}`,
      user: carousel
        ? `${input.brief}\n\nThe carousel:\n${describeCarousel(carousel)}`
        : input.brief,
    });

    if (input.postId) await ctx.services.saveCaption(input.postId, result.caption, result.hashtags);
    return { ...(input.postId ? { postId: input.postId } : {}), ...result };
  },
});
