import { CarouselTemplateId, SLIDE_THEMES } from "@snip/templates";
import { z } from "zod";

/** One slide as the agent sees and edits it. Mirrors slides + slides.layout. */
export const SlideRecord = z.object({
  template: CarouselTemplateId,
  theme: z.enum(SLIDE_THEMES),
  headline: z.string().max(120),
  body: z.string().max(400),
  slots: z.record(z.string(), z.string().max(300)),
});
export type SlideRecord = z.infer<typeof SlideRecord>;

export type CarouselDraft = { title: string; brief: string; slides: SlideRecord[] };

export type CarouselSnapshot = {
  postId: string;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  slides: SlideRecord[];
};

/**
 * Side effects the tools need, provided by the host app (Supabase in apps/web, fakes in
 * tests). Implementations must scope every call to the signed-in user's business.
 */
export interface AgentServices {
  createCarousel(draft: CarouselDraft): Promise<{ postId: string }>;
  getCarousel(postId: string): Promise<CarouselSnapshot | null>;
  /** Replace the carousel's slides (in order) and queue a re-render. */
  updateSlides(postId: string, slides: SlideRecord[]): Promise<void>;
  saveCaption(postId: string, caption: string, hashtags: string[]): Promise<void>;
}

/** Compact text form of a carousel for prompts. */
export function describeCarousel(c: CarouselSnapshot): string {
  const lines = c.slides.map((s, i) => {
    const extras = Object.entries(s.slots)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    return `${i + 1}. [${s.template}, ${s.theme}] ${s.headline}${s.body ? ` | ${s.body}` : ""}${extras ? ` | ${extras}` : ""}`;
  });
  return [
    `Carousel ${c.postId}${c.title ? ` "${c.title}"` : ""} (${c.slides.length} slides):`,
    ...lines,
    c.caption ? `Caption: ${c.caption}` : "Caption: not written yet",
    c.hashtags.length ? `Hashtags: ${c.hashtags.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
