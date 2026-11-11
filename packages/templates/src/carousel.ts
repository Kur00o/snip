import { z } from "zod";
import { escapeHtml, googleFontsUrl, safeUrl } from "./html";
import { SLIDE_THEMES, paletteFor, type Palette, type SlideBrand, type SlideTheme } from "./theme";

/** Carousel layouts. Ids match `templates.html_path` = system/carousel/<id>.html. */
export const CAROUSEL_TEMPLATES = [
  "bold-statement",
  "numbered-tips",
  "quote-card",
  "product-spotlight",
  "offer-cta",
] as const;
export const CarouselTemplateId = z.enum(CAROUSEL_TEMPLATES);
export type CarouselTemplateId = z.infer<typeof CarouselTemplateId>;

export const TEMPLATE_LABELS: Record<CarouselTemplateId, string> = {
  "bold-statement": "Bold statement",
  "numbered-tips": "Numbered tips",
  "quote-card": "Quote card",
  "product-spotlight": "Product spotlight",
  "offer-cta": "Offer and call to action",
};

/** Template id from a stored html_path, e.g. "system/carousel/quote-card.html". */
export function templateIdFromPath(path: string | null | undefined): CarouselTemplateId | null {
  const match = /carousel\/([a-z-]+)\.html$/.exec(path ?? "");
  const parsed = CarouselTemplateId.safeParse(match?.[1]);
  return parsed.success ? parsed.data : null;
}

/** What goes on one slide. Mirrors slides.headline / slides.body / slides.layout. */
export const SlideContent = z.object({
  template: CarouselTemplateId,
  theme: z.enum(SLIDE_THEMES).default("primary"),
  headline: z.string().max(120).default(""),
  body: z.string().max(400).default(""),
  /** Template-specific fields: kicker, number, quote, attribution, price, photo, offer, cta. */
  slots: z.record(z.string(), z.string().max(300)).default({}),
});
export type SlideContent = z.input<typeof SlideContent>;

type RenderArgs = {
  slide: SlideContent;
  brand: SlideBrand;
  /** 0-based position and deck length, for page numbers and swipe cues. */
  index: number;
  total: number;
};

const W = 1080;
const H = 1350;
const PAD = 96;

/** Headline size that fits: long headlines get smaller, never below 60px. */
export function headlineSize(text: string, max = 128): number {
  const n = text.trim().length;
  if (n <= 14) return max;
  if (n <= 28) return Math.round(max * 0.82);
  if (n <= 48) return Math.round(max * 0.66);
  if (n <= 72) return Math.round(max * 0.55);
  return Math.max(60, Math.round(max * 0.47));
}

/** Full, self-contained HTML document for one 1080×1350 slide. */
export function renderSlide({ slide: input, brand, index, total }: RenderArgs): string {
  const slide = SlideContent.parse(input);
  const palette = paletteFor(brand, slide.theme as SlideTheme);
  const fonts = googleFontsUrl([brand.headingFont, brand.bodyFont]);
  const body = BODIES[slide.template]({ slide, brand, palette, index, total });
  const heading = brand.headingFont ? `"${brand.headingFont}", ` : "";
  const text = brand.bodyFont ? `"${brand.bodyFont}", ` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, height=${H}">
${fonts ? `<link rel="stylesheet" href="${escapeHtml(fonts)}">` : ""}
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{
  --bg:${palette.bg};--fg:${palette.fg};--accent:${palette.accent};--muted:${palette.muted};--on-accent:${palette.onAccent};
  --heading:${heading}"Inter","Helvetica Neue",Arial,sans-serif;
  --text:${text}"Inter","Helvetica Neue",Arial,sans-serif;
  background:var(--bg);color:var(--fg);font-family:var(--text);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
.slide{position:relative;width:${W}px;height:${H}px;padding:${PAD}px;display:flex;flex-direction:column}
.h{font-family:var(--heading);font-weight:800;letter-spacing:-0.035em;line-height:0.98;text-wrap:balance}
.b{font-size:40px;line-height:1.35;color:var(--muted);text-wrap:pretty;max-width:860px}
.kicker{font-size:28px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent)}
.top{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:72px}
.logo{max-height:72px;max-width:240px;object-fit:contain}
.brand{font-family:var(--heading);font-weight:800;font-size:32px;letter-spacing:-0.02em}
.foot{position:absolute;left:${PAD}px;right:${PAD}px;bottom:72px;display:flex;justify-content:space-between;align-items:center;font-size:28px;color:var(--muted)}
.dots{display:flex;gap:10px}.dots i{width:12px;height:12px;border-radius:99px;background:var(--fg);opacity:.25}.dots i.on{opacity:1;background:var(--accent)}
.grow{flex:1}
</style>
</head>
<body><main class="slide">${body}</main></body>
</html>`;
}

type Ctx = {
  slide: z.output<typeof SlideContent>;
  brand: SlideBrand;
  palette: Palette;
  index: number;
  total: number;
};

const e = escapeHtml;
const slot = (c: Ctx, key: string) => c.slide.slots[key]?.trim() ?? "";

function top(c: Ctx, kicker = slot(c, "kicker")) {
  const logo = safeUrl(c.brand.logoUrl);
  return `<div class="top"><span class="kicker">${e(kicker)}</span>${
    logo
      ? `<img class="logo" src="${e(logo)}" alt="">`
      : `<span class="brand">${e(c.brand.businessName)}</span>`
  }</div>`;
}

function foot(c: Ctx) {
  const dots = Array.from({ length: Math.min(c.total, 10) }, (_, i) =>
    i === c.index ? '<i class="on"></i>' : "<i></i>",
  ).join("");
  const left = c.index === 0 && c.total > 1 ? "Swipe →" : e(c.brand.handle ?? "");
  return `<div class="foot"><span>${left}</span><span class="dots">${c.total > 1 ? dots : ""}</span></div>`;
}

const BODIES: Record<CarouselTemplateId, (c: Ctx) => string> = {
  "bold-statement": (c) => {
    const size = headlineSize(c.slide.headline, c.index === 0 ? 140 : 120);
    return `${top(c)}<div class="grow"></div>
<h1 class="h" style="font-size:${size}px">${e(c.slide.headline)}</h1>
${c.slide.body ? `<p class="b" style="margin-top:40px">${e(c.slide.body)}</p>` : ""}
<div style="height:120px"></div>${foot(c)}`;
  },

  "numbered-tips": (c) => {
    const number = slot(c, "number") || String(c.index).padStart(2, "0");
    return `${top(c)}
<div style="font-family:var(--heading);font-weight:800;font-size:260px;line-height:.85;letter-spacing:-0.06em;color:var(--accent);margin-top:72px">${e(number)}</div>
<div class="grow"></div>
<h2 class="h" style="font-size:${headlineSize(c.slide.headline, 96)}px">${e(c.slide.headline)}</h2>
${c.slide.body ? `<p class="b" style="margin-top:36px">${e(c.slide.body)}</p>` : ""}
<div style="height:120px"></div>${foot(c)}`;
  },

  "quote-card": (c) => {
    const quote = slot(c, "quote") || c.slide.headline;
    const by = slot(c, "attribution") || c.slide.body;
    return `${top(c)}
<div style="font-family:Georgia,serif;font-size:300px;line-height:.8;color:var(--accent);margin-top:64px">“</div>
<blockquote class="h" style="font-size:${headlineSize(quote, 112)}px;font-weight:700;line-height:1.08;margin-top:-40px">${e(quote)}</blockquote>
<div class="grow"></div>
${by ? `<p style="font-size:36px;font-weight:600">— ${e(by)}</p>` : ""}
<div style="height:120px"></div>${foot(c)}`;
  },

  "product-spotlight": (c) => {
    const photo = safeUrl(slot(c, "photo"));
    const price = slot(c, "price");
    const media = photo
      ? `<img src="${e(photo)}" alt="" style="width:100%;height:100%;object-fit:cover">`
      : `<div style="width:100%;height:100%;display:grid;place-items:center;background:repeating-linear-gradient(135deg,${c.palette.accent}22 0 24px,transparent 24px 48px);font-family:var(--heading);font-weight:800;font-size:200px;color:var(--accent)">${e(c.brand.businessName.slice(0, 1).toUpperCase())}</div>`;
    return `${top(c)}
<div style="margin-top:40px;height:640px;border-radius:40px;overflow:hidden;background:rgba(127,127,127,.12)">${media}</div>
<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-top:56px">
<h2 class="h" style="font-size:${headlineSize(c.slide.headline, 96)}px">${e(c.slide.headline)}</h2>
${price ? `<span style="flex:none;background:var(--accent);color:var(--on-accent);font-weight:800;font-size:48px;padding:16px 32px;border-radius:999px">${e(price)}</span>` : ""}
</div>
${c.slide.body ? `<p class="b" style="margin-top:28px">${e(c.slide.body)}</p>` : ""}
${foot(c)}`;
  },

  "offer-cta": (c) => {
    const offer = slot(c, "offer");
    const cta = slot(c, "cta") || "Visit us today";
    const where = slot(c, "handle") || c.brand.handle || "";
    return `${top(c)}<div class="grow"></div>
<h2 class="h" style="font-size:${headlineSize(c.slide.headline, 96)}px">${e(c.slide.headline)}</h2>
${offer ? `<p class="h" style="font-size:${headlineSize(offer, 170)}px;color:var(--accent);margin-top:32px">${e(offer)}</p>` : ""}
${c.slide.body ? `<p class="b" style="margin-top:32px">${e(c.slide.body)}</p>` : ""}
<div style="margin-top:56px;display:flex;align-items:center;gap:28px">
<span style="background:var(--fg);color:var(--bg);font-weight:800;font-size:40px;padding:24px 44px;border-radius:999px">${e(cta)}</span>
${where ? `<span style="font-size:32px;color:var(--muted)">${e(where)}</span>` : ""}
</div>
<div style="height:120px"></div>${foot(c)}`;
  },
};

/** Default layout for a slide given its role in the deck. */
export function defaultTemplateFor(index: number, total: number): CarouselTemplateId {
  if (index === 0) return "bold-statement";
  if (index === total - 1) return "offer-cta";
  return "numbered-tips";
}
