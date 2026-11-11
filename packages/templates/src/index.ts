import { z } from "zod";

export { escapeHtml, fillSlots, googleFontsUrl, safeUrl } from "./html";
export {
  Hex,
  SlideBrand,
  SLIDE_THEMES,
  type SlideTheme,
  type Palette,
  contrast,
  readableOn,
  paletteFor,
} from "./theme";
export {
  CAROUSEL_TEMPLATES,
  CarouselTemplateId,
  TEMPLATE_LABELS,
  SlideContent,
  defaultTemplateFor,
  headlineSize,
  renderSlide,
  templateIdFromPath,
} from "./carousel";

/** Carousel slide size used everywhere (Instagram portrait 4:5). */
export const SLIDE_SIZE = { width: 1080, height: 1350 } as const;

/**
 * An editable slot inside an HTML template, e.g. `{{headline}}`.
 * Mirrors the `templates.slots` jsonb column.
 */
export const TemplateSlot = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/, "slot keys are snake_case"),
  kind: z.enum(["text", "image", "color"]),
  label: z.string().min(1),
  maxChars: z.number().int().positive().optional(),
  required: z.boolean().default(true),
});
export type TemplateSlot = z.infer<typeof TemplateSlot>;

/** A template manifest. Mirrors a row in the `templates` table. */
export const TemplateManifest = z.object({
  name: z.string().min(1),
  kind: z.enum(["carousel", "reel", "thumbnail"]),
  htmlPath: z.string().min(1),
  slots: z.array(TemplateSlot).min(1),
  isSystem: z.boolean().default(true),
});
export type TemplateManifest = z.infer<typeof TemplateManifest>;
