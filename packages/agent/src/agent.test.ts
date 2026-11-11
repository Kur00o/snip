import { describe, expect, it } from "vitest";
import { BrandContext, renderBrandContext } from "./brand/context";
import type { LlmStreamer, RouteRequest, StreamEvent } from "./llm/types";
import { historyFromRows, runAgent, type AgentEvent } from "./orchestrator";
import { systemPrompt } from "./prompts/system";
import { executeTool, toToolSpec } from "./tools/define";
import { offerOptions } from "./tools/offer-options";

const brand = BrandContext.parse({
  businessName: "Chai Point",
  category: "Café",
  city: "Pune",
  audience: "Students near FC Road",
  goals: ["Grow followers"],
  tone: "friendly",
  colours: { primary: "#0F9D8F", accent: "#C6F432" },
  fonts: { heading: "Fraunces" },
  hasLogo: false,
  bannedWords: ["cheap"],
});

/** Fake LLM that replays one scripted step per call and records the requests. */
function fakeLlm(steps: StreamEvent[][]) {
  const requests: RouteRequest[] = [];
  const llm: LlmStreamer = {
    async *stream(request) {
      requests.push(structuredClone({ ...request, signal: undefined }));
      for (const event of steps.shift() ?? []) yield event;
    },
  };
  return { llm, requests };
}

const finish: StreamEvent = {
  type: "finish",
  provider: "gemini",
  model: "gemini-test",
  reason: "stop",
};

async function collect(stream: AsyncIterable<AgentEvent>) {
  const events: AgentEvent[] = [];
  for await (const e of stream) events.push(e);
  return events;
}

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

  it("goes into the system prompt with the one-question rule", () => {
    const prompt = systemPrompt(brand);
    expect(prompt).toContain("Chai Point");
    expect(prompt).toContain("exactly ONE focused question");
    expect(prompt).toContain("cannot design carousel images");
  });
});

describe("offer_options tool", () => {
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
    const ctx = { businessId: "b1" };
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
    const events = await collect(
      runAgent({ llm, brand, businessId: "b1", history: [], userMessage: "Write a caption" }),
    );
    expect(events.at(-1)).toMatchObject({
      type: "done",
      text: "Here's a caption",
      provider: "gemini",
    });
    expect(requests[0]?.messages[0]?.role).toBe("system");
    expect(requests[0]?.tools?.[0]?.function.name).toBe("offer_options");
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
    const events = await collect(
      runAgent({
        llm,
        brand,
        businessId: "b1",
        history: [],
        userMessage: "Make something for Diwali",
      }),
    );
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
    const events = await collect(
      runAgent({ llm, brand, businessId: "b1", history: [], userMessage: "Help" }),
    );
    expect(requests).toHaveLength(2);
    const toolMessage = requests[1]?.messages.at(-1);
    expect(toolMessage).toMatchObject({ role: "tool", tool_call_id: "c1" });
    expect(String((toolMessage as { content: string }).content)).toContain("error");
    expect(events.at(-1)).toMatchObject({ type: "done", text: "Carousel or Reel?" });
  });
});

describe("historyFromRows", () => {
  it("keeps the latest turns and summarises offered options", () => {
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
        ],
      },
    ];
    expect(historyFromRows(rows, 2)).toEqual([
      { role: "user", content: "Make a post" },
      { role: "assistant", content: "[I asked: Which format? Options: Carousel / Reel]" },
    ]);
  });
});
