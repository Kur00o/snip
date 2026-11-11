import { CarouselTemplateId, SLIDE_THEMES } from "@snip/templates";
import { z } from "zod";
import { defineTool } from "./define";

const SlotEdits = z.object({
  kicker: z.string().max(24),
  price: z.string().max(16),
  offer: z.string().max(30),
  cta: z.string().max(30),
  quote: z.string().max(160),
  attribution: z.string().max(40),
});

export const EditCarouselInput = z.object({
  postId: z.string().min(1),
  edits: z
    .array(
      z.object({
        slide: z.number().int().min(1).describe("1-based slide number"),
        headline: z.string().trim().min(1).max(70).optional(),
        body: z.string().trim().max(180).optional(),
        template: CarouselTemplateId.optional(),
        theme: z.enum(SLIDE_THEMES).optional(),
        slots: SlotEdits.partial()
          .optional()
          .describe("Set a field to an empty string to remove it"),
        remove: z.boolean().optional().describe("Delete this slide"),
      }),
    )
    .min(1)
    .max(10),
});

export const EditCarouselOutput = z.object({
  postId: z.string(),
  changed: z.array(z.number().int()),
  slideCount: z.number().int(),
});

/**
 * edit_carousel: apply the user's requested changes ("make slide 2 shorter") directly.
 * The orchestrator already sees the current slides, so it writes the new text itself.
 */
export const editCarousel = defineTool({
  name: "edit_carousel",
  description:
    "Change an existing carousel: rewrite a slide's headline/body, switch its layout (template) or colour theme, set fields like price or cta, or remove a slide. Slide numbers are 1-based. Write the final text yourself, keeping the brand voice.",
  input: EditCarouselInput,
  output: EditCarouselOutput,
  async run(input, ctx) {
    const carousel = await ctx.services.getCarousel(input.postId);
    if (!carousel) throw new Error(`Post ${input.postId} was not found.`);

    const slides = carousel.slides.map((s) => ({ ...s, slots: { ...s.slots } }));
    const removed = new Set<number>();
    const changed: number[] = [];

    for (const edit of input.edits) {
      const slide = slides[edit.slide - 1];
      if (!slide)
        throw new Error(`There is no slide ${edit.slide}; the carousel has ${slides.length}.`);
      if (edit.remove) removed.add(edit.slide - 1);
      if (edit.headline !== undefined) slide.headline = edit.headline;
      if (edit.body !== undefined) slide.body = edit.body;
      if (edit.template) slide.template = edit.template;
      if (edit.theme) slide.theme = edit.theme;
      if (edit.slots) {
        const merged: Record<string, string | undefined> = { ...slide.slots, ...edit.slots };
        slide.slots = Object.fromEntries(
          Object.entries(merged).filter((entry): entry is [string, string] => Boolean(entry[1])),
        );
      }
      changed.push(edit.slide);
    }

    const next = slides.filter((_, i) => !removed.has(i));
    if (next.length < 1) throw new Error("A carousel needs at least one slide.");
    await ctx.services.updateSlides(input.postId, next);
    return {
      postId: input.postId,
      changed: [...new Set(changed)].sort((a, b) => a - b),
      slideCount: next.length,
    };
  },
});
