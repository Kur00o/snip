import { CarouselTemplateId, defaultTemplateFor } from "@snip/templates";
import { z } from "zod";
import { renderBrandContext } from "../brand/context";
import { completeJson } from "../llm/json";
import type { SlideRecord } from "../services";
import { defineTool } from "./define";

export const PlanCarouselInput = z.object({
  brief: z
    .string()
    .trim()
    .min(3)
    .max(800)
    .describe(
      "What the carousel is about, with every fact the user gave (items, prices, dates, offer).",
    ),
  slideCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .default(5)
    .describe("3 to 10 slides; 5 is a good default."),
  style: z
    .enum(["announcement", "tips", "offer", "story", "quotes"])
    .default("announcement")
    .describe(
      "announcement: launch or news; tips: educational list; offer: promotion; story: behind the scenes; quotes: reviews",
    ),
});

const PlannedSlide = z.object({
  headline: z.string().trim().min(1).max(70),
  body: z.string().trim().max(180).default(""),
  kicker: z.string().trim().max(24).optional(),
  template: CarouselTemplateId.optional(),
  price: z.string().trim().max(16).optional(),
  offer: z.string().trim().max(30).optional(),
  cta: z.string().trim().max(30).optional(),
  quote: z.string().trim().max(160).optional(),
  attribution: z.string().trim().max(40).optional(),
});

export const CarouselPlan = z.object({
  title: z.string().trim().min(1).max(60),
  slides: z.array(PlannedSlide).min(3).max(10),
});
export type CarouselPlan = z.infer<typeof CarouselPlan>;

export const PlanCarouselOutput = z.object({
  postId: z.string().min(1),
  title: z.string(),
  slides: z.array(z.object({ headline: z.string(), body: z.string() })),
});

const STYLE_HINTS: Record<z.infer<typeof PlanCarouselInput>["style"], string> = {
  announcement:
    "Slide 1 hooks with the news, middle slides show what's new (one item per slide), last slide says where/when to come.",
  tips: "Slide 1 promises the value ('3 ways to…'), each middle slide is one tip, last slide invites them to save and visit.",
  offer:
    "Slide 1 states the offer boldly, middle slides show what's included and the conditions, last slide is a clear call to action with the deadline.",
  story:
    "Slide 1 is a curiosity hook, middle slides tell a short behind-the-scenes story, last slide connects it to visiting or buying.",
  quotes:
    "Use quote-card slides for real customer words only if the user gave them; otherwise ask for them with placeholders like [customer review].",
};

/** Turn a plan into stored slides: default layouts by position, alternating colour themes. */
export function planToSlides(plan: CarouselPlan): SlideRecord[] {
  const n = plan.slides.length;
  return plan.slides.map((s, i) => {
    const template = s.template ?? defaultTemplateFor(i, n);
    const slots: Record<string, string> = {};
    for (const key of ["kicker", "price", "offer", "cta", "quote", "attribution"] as const) {
      const value = s[key];
      if (value) slots[key] = value;
    }
    return {
      template,
      theme: i === 0 || i === n - 1 ? "primary" : i % 2 === 1 ? "secondary" : "dark",
      headline: s.headline,
      body: s.body,
      slots,
    };
  });
}

/** plan_carousel: write the slide copy in the brand's voice, save it as a draft post. */
export const planCarousel = defineTool({
  name: "plan_carousel",
  description:
    "Create an Instagram carousel draft: writes slide-by-slide copy in the brand's voice, saves it, and opens it in the carousel studio for the user. Call write_caption_and_hashtags afterwards with the returned postId.",
  input: PlanCarouselInput,
  output: PlanCarouselOutput,
  async run(input, ctx) {
    const plan = await completeJson(ctx.llm, {
      task: "bulk_text",
      signal: ctx.signal,
      schema: CarouselPlan,
      system: `You write Instagram carousel copy for a small business. Slides are 1080×1350 and read in 2 seconds each.

${renderBrandContext(ctx.brand)}

Rules:
- Exactly ${input.slideCount} slides. ${STYLE_HINTS[input.style]}
- Headlines: max 8 words, punchy, in the brand's tone. Body: one short sentence (max 20 words) or empty.
- Optional fields per slide: kicker (2-3 word label), price, offer (e.g. "20% off"), cta (button text on the last slide), quote + attribution (only real quotes the user gave).
- Optional template per slide: ${CarouselTemplateId.options.join(", ")}. Leave it out to use sensible defaults.
- Never invent prices, dates, addresses or offers. Use placeholders like [price] when unknown.
- Never use these words: ${ctx.brand.bannedWords.join(", ") || "(none)"}.

JSON shape: {"title": "short internal name", "slides": [{"headline": "...", "body": "...", "kicker": "..."}]}`,
      user: input.brief,
    });

    const slides = planToSlides(plan);
    const { postId } = await ctx.services.createCarousel({
      title: plan.title,
      brief: input.brief,
      slides,
    });
    return {
      postId,
      title: plan.title,
      slides: slides.map((s) => ({ headline: s.headline, body: s.body })),
    };
  },
});
