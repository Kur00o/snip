import { describe, expect, it } from "vitest";
import { completeJson, extractJson, InvalidModelOutputError } from "../llm/json";
import { describeCarousel, type CarouselSnapshot } from "../services";
import { fakeLlm, fakeServices, toolContext } from "../testing";
import { normaliseHashtag, writeCaption } from "./caption";
import { executeTool } from "./define";
import { editCarousel } from "./edit-carousel";
import { CarouselPlan, planCarousel, planToSlides } from "./plan-carousel";
import { z } from "zod";

const existing: CarouselSnapshot = {
  postId: "p1",
  title: "Menu",
  caption: null,
  hashtags: [],
  slides: [
    {
      template: "bold-statement",
      theme: "primary",
      headline: "The monsoon menu is here",
      body: "Rainy days, sorted.",
      slots: {},
    },
    {
      template: "numbered-tips",
      theme: "secondary",
      headline: "Masala chai + vada pav",
      body: "Hot, crisp and ready.",
      slots: { price: "₹79" },
    },
    {
      template: "offer-cta",
      theme: "primary",
      headline: "Come in from the rain",
      body: "",
      slots: { cta: "Visit us" },
    },
  ],
};

describe("extractJson / completeJson", () => {
  it("strips reasoning blocks and code fences", () => {
    expect(extractJson('<think>hmm</think>\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson("no json here")).toThrow();
  });

  it("gives the model one chance to fix invalid output", async () => {
    const { llm, requests } = fakeLlm(['{"n": "two"}', '{"n": 2}']);
    const result = await completeJson(llm, {
      task: "bulk_text",
      system: "s",
      user: "u",
      schema: z.object({ n: z.number() }),
    });
    expect(result).toEqual({ n: 2 });
    expect(requests[1]?.messages.at(-1)?.content).toContain("didn't validate");
    expect(requests[0]?.json).toBe(true);
    expect(requests[0]?.task).toBe("bulk_text");
  });

  it("gives up after the second bad answer", async () => {
    const { llm } = fakeLlm(["nope", "still nope"]);
    await expect(
      completeJson(llm, {
        task: "bulk_text",
        system: "s",
        user: "u",
        schema: z.object({ n: z.number() }),
      }),
    ).rejects.toBeInstanceOf(InvalidModelOutputError);
  });
});

describe("plan_carousel", () => {
  it("writes slides with default layouts and saves a draft", async () => {
    const plan = {
      title: "Monsoon",
      slides: [
        { headline: "The monsoon menu is here", body: "Rainy days, sorted.", kicker: "New" },
        { headline: "Masala chai + vada pav", body: "Hot and crisp", price: "[price]" },
        { headline: "Kanda bhaji", body: "Made to share" },
        { headline: "Come in from the rain", body: "", cta: "Visit FC Road" },
      ],
    };
    const { llm, requests } = fakeLlm([JSON.stringify(plan)]);
    const { services, posts } = fakeServices();
    const outcome = await executeTool(
      [planCarousel],
      "plan_carousel",
      JSON.stringify({ brief: "Monsoon menu launch", slideCount: 4 }),
      toolContext(llm, services),
    );
    expect(outcome).toMatchObject({ ok: true, output: { postId: "post-1", title: "Monsoon" } });
    const saved = posts.get("post-1");
    if (!saved) throw new Error("carousel was not saved");
    expect(saved.slides.map((s) => s.template)).toEqual([
      "bold-statement",
      "numbered-tips",
      "numbered-tips",
      "offer-cta",
    ]);
    expect(saved.slides[0]?.slots).toEqual({ kicker: "New" });
    expect(saved.slides[3]?.slots).toEqual({ cta: "Visit FC Road" });
    expect(requests[0]?.messages[0]?.content).toContain("Exactly 4 slides");
    expect(requests[0]?.messages[0]?.content).toContain("cheap"); // banned words reach the prompt
  });

  it("rejects briefs that are too short", async () => {
    const outcome = await executeTool(
      [planCarousel],
      "plan_carousel",
      '{"brief":"x"}',
      toolContext(fakeLlm([]).llm, fakeServices().services),
    );
    expect(outcome.ok).toBe(false);
  });

  it("alternates colour themes between the cover and the call to action", () => {
    const plan = CarouselPlan.parse({
      title: "t",
      slides: ["a", "b", "c", "d", "e"].map((h) => ({ headline: h })),
    });
    expect(planToSlides(plan).map((s) => s.theme)).toEqual([
      "primary",
      "secondary",
      "dark",
      "secondary",
      "primary",
    ]);
  });
});

describe("write_caption_and_hashtags", () => {
  it("normalises hashtags", () => {
    expect(normaliseHashtag("#Pune Cafe")).toBe("#punecafe");
    expect(normaliseHashtag("##chai_time!")).toBe("#chai_time");
    expect(normaliseHashtag("#")).toBeNull();
  });

  it("retries when the caption uses a banned word, then saves it on the post", async () => {
    const bad = { caption: "Cheap chai all day!", hashtags: ["#a1", "#b2", "#c3", "#d4", "#e5"] };
    const good = {
      caption: "Chai that hugs back ☕ Come by FC Road today.",
      hashtags: ["#PuneCafe", "#chai", "#fcroad", "#monsoon", "#punefood", "#punefood"],
    };
    const { llm, requests } = fakeLlm([JSON.stringify(bad), JSON.stringify(good)]);
    const { services, posts } = fakeServices([existing]);
    const outcome = await executeTool(
      [writeCaption],
      "write_caption_and_hashtags",
      JSON.stringify({ brief: "Monsoon menu", postId: "p1" }),
      toolContext(llm, services),
    );
    expect(outcome).toMatchObject({ ok: true, output: { postId: "p1" } });
    expect(posts.get("p1")?.hashtags).toEqual([
      "#punecafe",
      "#chai",
      "#fcroad",
      "#monsoon",
      "#punefood",
    ]);
    expect(requests[0]?.messages[1]?.content).toContain("Masala chai + vada pav"); // carousel context
    expect(requests).toHaveLength(2);
  });

  it("fails clearly for an unknown post", async () => {
    const outcome = await executeTool(
      [writeCaption],
      "write_caption_and_hashtags",
      JSON.stringify({ brief: "Monsoon menu", postId: "nope" }),
      toolContext(fakeLlm([]).llm, fakeServices().services),
    );
    expect(outcome).toMatchObject({ ok: false, error: "Post nope was not found." });
  });
});

describe("edit_carousel", () => {
  it("edits, switches layouts and removes slides", async () => {
    const { services, posts } = fakeServices([existing]);
    const outcome = await executeTool(
      [editCarousel],
      "edit_carousel",
      JSON.stringify({
        postId: "p1",
        edits: [
          {
            slide: 2,
            body: "Hot and crisp.",
            slots: { price: "₹99" },
            template: "product-spotlight",
          },
          { slide: 3, slots: { cta: "" }, remove: false },
          { slide: 1, remove: true },
        ],
      }),
      toolContext(fakeLlm([]).llm, services),
    );
    expect(outcome).toMatchObject({ ok: true, output: { changed: [1, 2, 3], slideCount: 2 } });
    const slides = posts.get("p1")?.slides ?? [];
    expect(slides[0]).toMatchObject({
      template: "product-spotlight",
      body: "Hot and crisp.",
      slots: { price: "₹99" },
    });
    expect(slides[1]?.slots).toEqual({});
  });

  it("refuses slide numbers that don't exist", async () => {
    const outcome = await executeTool(
      [editCarousel],
      "edit_carousel",
      JSON.stringify({ postId: "p1", edits: [{ slide: 9, headline: "x" }] }),
      toolContext(fakeLlm([]).llm, fakeServices([existing]).services),
    );
    expect(outcome).toMatchObject({ ok: false, error: "There is no slide 9; the carousel has 3." });
  });
});

describe("describeCarousel", () => {
  it("lists slides with layouts and extras for the prompt", () => {
    const text = describeCarousel(existing);
    expect(text).toContain(
      "2. [numbered-tips, secondary] Masala chai + vada pav | Hot, crisp and ready. | price: ₹79",
    );
    expect(text).toContain("Caption: not written yet");
  });
});
