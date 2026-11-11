import { describe, expect, it } from "vitest";
import {
  CAROUSEL_TEMPLATES,
  contrast,
  defaultTemplateFor,
  headlineSize,
  paletteFor,
  renderSlide,
  templateIdFromPath,
  type SlideBrand,
} from "./index";

const brand: SlideBrand = {
  businessName: "Chai Point",
  handle: "@chaipoint.pune",
  primary: "#0F9D8F",
  secondary: "#FAF8F5",
  accent: "#C6F432",
  headingFont: "Fraunces",
  bodyFont: "Inter",
  logoUrl: null,
};

describe("palette", () => {
  it("keeps text readable on every theme", () => {
    for (const theme of ["primary", "secondary", "dark"] as const) {
      const p = paletteFor(brand, theme);
      expect(contrast(p.fg, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, p.bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it("drops an accent that would disappear into the background", () => {
    const p = paletteFor({ ...brand, accent: "#FFFFFF", secondary: "#FFFFFF" }, "secondary");
    expect(p.accent).toBe("#0F9D8F"); // falls back to the primary colour, which is readable
  });
});

describe("renderSlide", () => {
  it("renders every template as a full 1080×1350 document", () => {
    for (const template of CAROUSEL_TEMPLATES) {
      const html = renderSlide({
        slide: {
          template,
          headline: "Monsoon menu",
          body: "Hot chai",
          slots: { price: "₹79", offer: "20% off" },
        },
        brand,
        index: 1,
        total: 5,
      });
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("width:1080px;height:1350px");
      expect(html).toContain("Monsoon menu");
      expect(html).toContain("family=Fraunces");
    }
  });

  it("escapes user text and refuses non-http image URLs", () => {
    const html = renderSlide({
      slide: {
        template: "product-spotlight",
        headline: "<script>alert(1)</script>",
        slots: { photo: "javascript:alert(1)" },
      },
      brand: {
        ...brand,
        logoUrl: "https://x.supabase.co/storage/v1/object/sign/logo.png?token=a&b=1",
      },
      index: 0,
      total: 1,
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:");
    expect(html).toContain(
      'src="https://x.supabase.co/storage/v1/object/sign/logo.png?token=a&amp;b=1"',
    );
  });

  it("adds a swipe cue on the cover and page dots on multi-slide decks", () => {
    const cover = renderSlide({
      slide: { template: "bold-statement", headline: "Hi" },
      brand,
      index: 0,
      total: 4,
    });
    expect(cover).toContain("Swipe →");
    expect(cover.match(/<i/g)).toHaveLength(4);
    const single = renderSlide({
      slide: { template: "bold-statement", headline: "Hi" },
      brand,
      index: 0,
      total: 1,
    });
    expect(single).not.toContain("Swipe");
  });
});

describe("helpers", () => {
  it("shrinks long headlines but keeps them legible", () => {
    expect(headlineSize("Short")).toBe(128);
    expect(headlineSize("x".repeat(120))).toBeGreaterThanOrEqual(60);
  });

  it("maps html paths and deck positions to templates", () => {
    expect(templateIdFromPath("system/carousel/quote-card.html")).toBe("quote-card");
    expect(templateIdFromPath("system/reel/clean-captions.html")).toBeNull();
    expect([0, 1, 2, 3].map((i) => defaultTemplateFor(i, 4))).toEqual([
      "bold-statement",
      "numbered-tips",
      "numbered-tips",
      "offer-cta",
    ]);
  });
});
