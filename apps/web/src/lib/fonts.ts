/**
 * Google Fonts offered in the brand kit. Free to use commercially, and loaded by the
 * worker when rendering slides. `devanagari` marks fonts that also cover Hindi/Marathi.
 */
export const BRAND_FONTS = [
  { name: "Inter", style: "Clean sans", devanagari: false },
  { name: "Manrope", style: "Clean sans", devanagari: false },
  { name: "Plus Jakarta Sans", style: "Clean sans", devanagari: false },
  { name: "Outfit", style: "Geometric sans", devanagari: false },
  { name: "Sora", style: "Geometric sans", devanagari: false },
  { name: "Bricolage Grotesque", style: "Characterful sans", devanagari: false },
  { name: "Poppins", style: "Geometric sans", devanagari: true },
  { name: "Mukta", style: "Humanist sans", devanagari: true },
  { name: "Hind", style: "Humanist sans", devanagari: true },
  { name: "Baloo 2", style: "Rounded, friendly", devanagari: true },
  { name: "Fraunces", style: "Warm serif", devanagari: false },
  { name: "DM Serif Display", style: "Elegant serif", devanagari: false },
  { name: "Playfair Display", style: "Elegant serif", devanagari: false },
  { name: "Lora", style: "Book serif", devanagari: false },
  { name: "Bebas Neue", style: "Tall display", devanagari: false },
  { name: "Anton", style: "Heavy display", devanagari: false },
  { name: "Caveat", style: "Handwritten", devanagari: false },
  { name: "Pacifico", style: "Script", devanagari: false },
] as const;

export type BrandFontName = (typeof BRAND_FONTS)[number]["name"];
export const BRAND_FONT_NAMES = BRAND_FONTS.map((f) => f.name) as [
  BrandFontName,
  ...BrandFontName[],
];

export function isBrandFont(value: unknown): value is BrandFontName {
  return typeof value === "string" && (BRAND_FONT_NAMES as readonly string[]).includes(value);
}

/** One stylesheet URL for the given fonts (regular + bold), or null if none. */
export function googleFontsHref(fonts: readonly (string | null | undefined)[]): string | null {
  const unique = [...new Set(fonts.filter(isBrandFont))];
  if (unique.length === 0) return null;
  const families = unique
    .map((name) => {
      // Some display faces only ship one weight.
      const single = name === "Bebas Neue" || name === "Anton" || name === "Pacifico";
      return `family=${encodeURIComponent(name).replaceAll("%20", "+")}${single ? "" : ":wght@400;700"}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
