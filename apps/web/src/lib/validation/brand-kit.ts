import { z } from "zod";
import { BRAND_FONT_NAMES } from "@/lib/fonts";

export const DEFAULT_PRIMARY = "#0F9D8F";

const Hex = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex colour like #0F9D8F")
  .transform((v) => v.toUpperCase());

const OptionalHex = z
  .union([Hex, z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable();

const OptionalFont = z
  .union([z.enum(BRAND_FONT_NAMES), z.literal("")])
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Brand kit form. Mirrors brand_kits columns; voice and banned words live in `extra`. */
export const BrandKitInput = z.object({
  primaryColor: Hex,
  secondaryColor: OptionalHex,
  accentColor: OptionalHex,
  headingFont: OptionalFont,
  bodyFont: OptionalFont,
  voice: z.string().trim().max(500, "Keep it under 500 characters"),
  bannedWords: z
    .array(z.string().trim().min(1).max(40))
    .max(30, "Up to 30 words")
    .transform((words) => [...new Set(words.map((w) => w.toLowerCase()))]),
});
export type BrandKitInput = z.input<typeof BrandKitInput>;
export type BrandKitValues = z.output<typeof BrandKitInput>;

/** "cheap, discount,  " → ["cheap", "discount"] */
export function parseWordList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean);
}

export const LOGO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;
export type LogoType = keyof typeof LOGO_TYPES;
export const MAX_LOGO_BYTES = 10 * 1024 * 1024;

export const LogoUploadRequest = z.object({
  contentType: z.enum(Object.keys(LOGO_TYPES) as [LogoType, ...LogoType[]], {
    message: "Upload a PNG, JPG or WebP image",
  }),
  size: z.number().int().positive().max(MAX_LOGO_BYTES, "Logos must be under 10 MB"),
});

/** WCAG relative-luminance contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(bl ?? 0);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick ink or white text for a background colour, whichever reads better. */
export function readableTextOn(background: string): "#14162B" | "#FFFFFF" {
  return contrastRatio(background, "#14162B") >= contrastRatio(background, "#FFFFFF")
    ? "#14162B"
    : "#FFFFFF";
}
