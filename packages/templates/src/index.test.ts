import { describe, expect, it } from "vitest";
import { fillSlots, TemplateManifest } from "./index";

describe("templates", () => {
  it("validates a manifest and applies slot defaults", () => {
    const manifest = TemplateManifest.parse({
      name: "Bold headline",
      kind: "carousel",
      htmlPath: "carousel/bold-headline.html",
      slots: [{ key: "headline", kind: "text", label: "Headline", maxChars: 60 }],
    });
    expect(manifest.isSystem).toBe(true);
    expect(manifest.slots[0]?.required).toBe(true);
  });

  it("rejects bad slot keys", () => {
    const result = TemplateManifest.safeParse({
      name: "x",
      kind: "carousel",
      htmlPath: "x.html",
      slots: [{ key: "Head Line", kind: "text", label: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("fills slots and escapes HTML", () => {
    const html = "<h1>{{ headline }}</h1><p>{{body}}</p><i>{{missing}}</i>";
    expect(fillSlots(html, { headline: "Chai & <b>bun</b>", body: "₹49 only" })).toBe(
      "<h1>Chai &amp; &lt;b&gt;bun&lt;/b&gt;</h1><p>₹49 only</p><i>{{missing}}</i>",
    );
  });
});
