import { z } from "zod";

export const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** Brand values a slide needs. Built from the business + brand kit. */
export const SlideBrand = z.object({
  businessName: z.string().min(1),
  handle: z.string().nullish(),
  primary: Hex,
  secondary: Hex.nullish(),
  accent: Hex.nullish(),
  headingFont: z.string().nullish(),
  bodyFont: z.string().nullish(),
  /** https URL (e.g. a signed Storage URL) to the logo. */
  logoUrl: z.url({ protocol: /^https?$/ }).nullish(),
});
export type SlideBrand = z.infer<typeof SlideBrand>;

export const SLIDE_THEMES = ["primary", "secondary", "dark"] as const;
export type SlideTheme = (typeof SLIDE_THEMES)[number];

export type Palette = { bg: string; fg: string; accent: string; muted: string; onAccent: string };

const INK = "#14162B";
const WHITE = "#FFFFFF";
const PAPER = "#FAF8F5";
const NEAR_BLACK = "#111318";

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #RRGGBB colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ink or white, whichever reads better on the background. */
export function readableOn(bg: string): string {
  return contrast(bg, INK) >= contrast(bg, WHITE) ? INK : WHITE;
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/**
 * Colours for one slide. Text always meets 4.5:1 on its background; the accent is only
 * used when it reaches 3:1 (large text), otherwise it falls back to the text colour.
 */
export function paletteFor(brand: SlideBrand, theme: SlideTheme): Palette {
  const bg =
    theme === "primary"
      ? brand.primary
      : theme === "secondary"
        ? (brand.secondary ?? PAPER)
        : NEAR_BLACK;
  const fg = readableOn(bg);
  const candidates = [brand.accent, theme === "primary" ? null : brand.primary].filter(
    (c): c is string => Boolean(c),
  );
  const accent = candidates.find((c) => contrast(c, bg) >= 3) ?? fg;
  return { bg, fg, accent, muted: withAlpha(fg, 0.72), onAccent: readableOn(accent) };
}
