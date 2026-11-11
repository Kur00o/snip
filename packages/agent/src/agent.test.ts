import { describe, expect, it } from "vitest";
import { BrandContext, renderBrandContext } from "./brand/context";
import type { StreamEvent } from "./llm/types";
import { historyFromRows, runAgent, type AgentEvent } from "./orchestrator";
import { PHASE_4_CAPABILITIES, systemPrompt } from "./prompts/system";
import { fakeLlm, fakeServices, finish, testBrand as brand, toolContext } from "./testing";
import { executeTool, toToolSpec } from "./tools/define";
import { offerOptions } from "./tools/offer-options";

async function collect(stream: AsyncIterable<AgentEvent>) {
  const events: AgentEvent[] = [];
  for await (const e of stream) events.push(e);
  return events;
}

const run = (llm: ReturnType<typeof fakeLlm>["llm"], userMessage: string) =>
  runAgent({
    llm,
    brand,
    businessId: "b1",
    services: fakeServices().services,
    history: [],
    userMessage,
  });

describe("brand context", () => {
  it("renders a compact brief with banned words and a first-post note", () => {
    const text = renderBrandContext(brand);
    expect(text).toContain("Business: Chai Point (Café), Pune");
    expect(text).toContain("Never use these words: cheap");
    expect(text).toContain("No posts yet");
    expect(text).not.toContain("secondary");
  });

  it("rejects malformed rows", () => {
    expect(BrandContext.safeParse({ businessName: "" }).success).toBe(false);
  });

  it("goes into the system prompt with the one-question rule and carousel tools", () => {
    const prompt = systemPrompt(brand);
    expect(prompt).toContain("Chai Point");
    expect(prompt).toContain("exactly ONE focused question");
    expect(prompt).toContain("plan_carousel");
    expect(prompt).toContain("cannot edit Reels");
    expect(systemPrompt(brand, PHASE_4_CAPABILITIES)).toContain("cannot design carousel images");
    expect(systemPrompt(brand, undefined, new Date(), "Carousel post-1 (2 slides)")).toContain(
      "The carousel in this chat",
    );
  });
});

describe("offer_options tool", () => {
  const ctx = toolContext(fakeLlm([]).llm, fakeServices().services);
  const args = (o: unknown) => JSON.stringify(o);
  const valid = {
    question: "Where should this go?",
    options: [
      { label: "Instagram carousel", reply: "Make it an Instagram carousel" },
      { label: "Reel", reply: "Make it a Reel" },
    ],
  };

  it("exposes a JSON Schema the model can read", () => {
    const spec = toToolSpec(offerOptions);
    expect(spec.function.name).toBe("offer_options");
    expect(spec.function.parameters).toMatchObject({
      type: "object",
      required: ["question", "options"],
    });
    expect(spec.function.parameters).not.toHaveProperty("$schema");
  });

  it("accepts 2 to 4 options and rejects anything else", async () => {
    await expect(
      executeTool([offerOptions], "offer_options", args(valid), ctx),
    ).resolves.toMatchObject({
      ok: true,
      output: valid,
    });
    const tooFew = await executeTool(
      [offerOptions],
      "offer_options",
      args({ ...valid, options: valid.options.slice(0, 1) }),
      ctx,
    );
    expect(tooFew.ok).toBe(false);
    const badJson = await executeTool([offerOptions], "offer_options", "{nope", ctx);
    expect(badJson).toMatchObject({ ok: false, error: "Arguments were not valid JSON." });
    const unknown = await executeTool([offerOptions], "post_to_tiktok", "{}", ctx);
    expect(unknown.ok).toBe(false);
  });
});

describe("runAgent", () => {
  it("streams a plain answer", async () => {
    const { llm, requests } = fakeLlm([[{ type: "text", delta: "Here's a caption" }, finish]]);
    const events = await collect(run(llm, "Write a caption"));
    expect(events.at(-1)).toMatchObject({
      type: "done",
      text: "Here's a caption",
      provider: "gemini",
    });
    expect(requests[0]?.messages[0]?.role).toBe("system");
    expect(requests[0]?.tools?.map((t) => t.function.name)).toEqual([
      "offer_options",
      "plan_carousel",
      "write_caption_and_hashtags",
      "edit_carousel",
    ]);
  });

  it("ends the turn after offer_options so the user can tap a choice", async () => {
    const options = {
      question: "Which format?",
      options: [
        { label: "Carousel", reply: "Carousel please" },
        { label: "Reel", reply: "A Reel" },
      ],
    };
    const { llm, requests } = fakeLlm([
      [
        {
          type: "tool_calls",
          calls: [
            {
              id: "c1",
              type: "function",
              function: { name: "offer_options", arguments: JSON.stringify(options) },
            },
          ],
        },
        finish,
      ],
      [{ type: "text", delta: "should not run" }, finish],
    ]);
    const events = await collect(run(llm, "Make something for Diwali"));
    expect(requests).toHaveLength(1);
    const tool = events.find((e) => e.type === "tool");
    expect(tool).toMatchObject({ outcome: { ok: true, name: "offer_options", output: options } });
    expect(events.at(-1)).toMatchObject({ type: "done", tools: [{ ok: true }] });
  });

  it("feeds tool errors back so the model can recover", async () => {
    const { llm, requests } = fakeLlm([
      [
        {
          type: "tool_calls",
          calls: [
            { id: "c1", type: "function", function: { name: "offer_options", arguments: "{}" } },
          ],
        },
        finish,
      ],
      [{ type: "text", delta: "Carousel or Reel?" }, finish],
    ]);
    const events = await collect(run(llm, "Help"));
    expect(requests).toHaveLength(2);
    const toolMessage = requests[1]?.messages.at(-1);
    expect(toolMessage).toMatchObject({ role: "tool", tool_call_id: "c1" });
    expect(String((toolMessage as { content: string }).content)).toContain("error");
    expect(events.at(-1)).toMatchObject({ type: "done", text: "Carousel or Reel?" });
  });

  it("runs plan_carousel, then the caption tool, then answers", async () => {
    const plan = JSON.stringify({
      title: "Monsoon menu",
      slides: [
        { headline: "The monsoon menu is here", body: "Rainy days, sorted." },
        { headline: "Masala chai + vada pav", body: "[price] till 7pm", price: "[price]" },
        { headline: "Come in from the rain", body: "", cta: "Visit FC Road" },
      ],
    });
    const caption = JSON.stringify({
      caption: "Rain outside, chai inside ☕",
      hashtags: ["#punecafe", "#monsoon", "#chai", "#fcroad", "#punefood"],
    });
    const call = (id: string, name: string, args: unknown): StreamEvent => ({
      type: "tool_calls",
      calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
    });
    const { llm } = fakeLlm([
      [call("c1", "plan_carousel", { brief: "Monsoon menu launch", slideCount: 3 }), finish],
      plan,
      [
        call("c2", "write_caption_and_hashtags", {
          brief: "Monsoon menu launch",
          postId: "post-1",
        }),
        finish,
      ],
      caption,
      "Your monsoon carousel is ready in the studio.",
    ]);
    const { services, posts } = fakeServices();
    const events = await collect(
      runAgent({
        llm,
        brand,
        businessId: "b1",
        services,
        history: [],
        userMessage: "Carousel for our monsoon menu",
      }),
    );
    const done = events.at(-1);
    expect(done).toMatchObject({
      type: "done",
      text: "Your monsoon carousel is ready in the studio.",
    });
    expect(posts.get("post-1")?.slides).toHaveLength(3);
    expect(posts.get("post-1")?.caption).toBe("Rain outside, chai inside ☕");
  });
});

describe("historyFromRows", () => {
  it("keeps the latest turns and summarises tools", () => {
    const rows = [
      { role: "user", content: "old", tool_calls: null },
      { role: "user", content: "Make a post", tool_calls: null },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            ok: true,
            name: "offer_options",
            output: {
              question: "Which format?",
              options: [{ label: "Carousel" }, { label: "Reel" }],
            },
          },
          {
            ok: true,
            name: "plan_carousel",
            output: { postId: "p1", title: "Menu", slides: [{ headline: "Hi" }] },
          },
        ],
      },
    ];
    expect(historyFromRows(rows, 2)).toEqual([
      { role: "user", content: "Make a post" },
      {
        role: "assistant",
        content:
          '[I asked: Which format? Options: Carousel / Reel]\n[Created carousel p1 "Menu": 1. Hi]',
      },
    ]);
  });
});
