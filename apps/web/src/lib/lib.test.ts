import { describe, expect, it } from "vitest";
import { buildChecklist, checklistProgress } from "./checklist";
import { googleFontsHref } from "./fonts";
import { isProtectedPath, safeNextPath } from "./routes";
import {
  BrandKitInput,
  LogoUploadRequest,
  contrastRatio,
  parseWordList,
  readableTextOn,
} from "./validation/brand-kit";
import { BusinessProfile, goalsFromText, goalsToText } from "./validation/business";

describe("routes", () => {
  it("protects app pages but not public ones", () => {
    expect(isProtectedPath("/home")).toBe(true);
    expect(isProtectedPath("/brand/logo")).toBe(true);
    expect(isProtectedPath("/homepage")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  it("only allows same-site relative redirects", () => {
    expect(safeNextPath("/brand?tab=1")).toBe("/brand?tab=1");
    expect(safeNextPath("https://evil.com")).toBe("/home");
    expect(safeNextPath("//evil.com")).toBe("/home");
    expect(safeNextPath("/\\evil.com")).toBe("/home");
    expect(safeNextPath(null, "/onboarding")).toBe("/onboarding");
  });
});

describe("BusinessProfile", () => {
  const valid = {
    name: "  Chai Point ",
    category: "Café",
    city: "Pune",
    targetAudience: "Students near FC Road",
    goals: ["Grow followers"],
    tone: "friendly",
  };

  it("accepts and trims a complete profile", () => {
    const parsed = BusinessProfile.parse(valid);
    expect(parsed.name).toBe("Chai Point");
  });

  it("explains what is missing", () => {
    const result = BusinessProfile.safeParse({ ...valid, name: " ", goals: [], tone: "angry" });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["name", "goals", "tone"]));
  });

  it("round-trips goals through the text column", () => {
    const goals = ["Grow followers", "Sell; more online"];
    expect(goalsFromText(goalsToText(goals))).toEqual(["Grow followers", "Sell, more online"]);
    expect(goalsFromText(null)).toEqual([]);
  });
});

describe("BrandKitInput", () => {
  it("normalises colours, empty optionals and banned words", () => {
    const parsed = BrandKitInput.parse({
      primaryColor: "#0f9d8f",
      secondaryColor: "",
      accentColor: "#c6f432",
      headingFont: "Fraunces",
      bodyFont: "",
      voice: "Warm",
      bannedWords: ["Cheap", "cheap", "Best ever"],
    });
    expect(parsed.primaryColor).toBe("#0F9D8F");
    expect(parsed.secondaryColor).toBeNull();
    expect(parsed.bodyFont).toBeNull();
    expect(parsed.bannedWords).toEqual(["cheap", "best ever"]);
  });

  it("rejects bad colours and unknown fonts", () => {
    expect(
      BrandKitInput.safeParse({ primaryColor: "teal", voice: "", bannedWords: [] }).success,
    ).toBe(false);
    expect(
      BrandKitInput.safeParse({
        primaryColor: "#000000",
        headingFont: "Comic Sans",
        voice: "",
        bannedWords: [],
      }).success,
    ).toBe(false);
  });

  it("splits word lists on commas and new lines", () => {
    expect(parseWordList("cheap, discount\n best ever ,,")).toEqual([
      "cheap",
      "discount",
      "best ever",
    ]);
  });

  it("limits logo uploads to images under 10 MB", () => {
    expect(LogoUploadRequest.safeParse({ contentType: "image/png", size: 1000 }).success).toBe(
      true,
    );
    expect(LogoUploadRequest.safeParse({ contentType: "image/svg+xml", size: 1000 }).success).toBe(
      false,
    );
    expect(
      LogoUploadRequest.safeParse({ contentType: "image/png", size: 11 * 1024 * 1024 }).success,
    ).toBe(false);
  });
});

describe("contrast", () => {
  it("matches WCAG ratios for the Snip palette", () => {
    expect(contrastRatio("#0F9D8F", "#FFFFFF")).toBeCloseTo(3.37, 1);
    expect(contrastRatio("#14162B", "#0F9D8F")).toBeCloseTo(5.29, 1);
  });

  it("picks readable text for a background", () => {
    expect(readableTextOn("#0F9D8F")).toBe("#14162B");
    expect(readableTextOn("#14162B")).toBe("#FFFFFF");
    expect(readableTextOn("#C6F432")).toBe("#14162B");
  });
});

describe("checklist", () => {
  it("tracks what is left to set up", () => {
    const items = buildChecklist({
      brandKit: {
        secondary_color: "#FFFFFF",
        accent_color: null,
        heading_font: "Inter",
        body_font: null,
        logo_path: null,
      },
      connectedAccounts: 0,
    });
    expect(items.map((i) => [i.id, i.done])).toEqual([
      ["colours", true],
      ["fonts", false],
      ["logo", false],
      ["accounts", false],
    ]);
    expect(checklistProgress(items)).toBe(0.25);
  });

  it("handles a missing brand kit", () => {
    expect(
      buildChecklist({ brandKit: null, connectedAccounts: 2 }).filter((i) => i.done),
    ).toHaveLength(1);
  });
});

describe("googleFontsHref", () => {
  it("builds one stylesheet URL for known fonts only", () => {
    expect(googleFontsHref(["Fraunces", "Bebas Neue", "Fraunces", "Comic Sans", null])).toBe(
      "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700&family=Bebas+Neue&display=swap",
    );
    expect(googleFontsHref([null, ""])).toBeNull();
  });
});
