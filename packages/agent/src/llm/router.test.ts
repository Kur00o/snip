import { describe, expect, it, vi } from "vitest";
import { AllProvidersFailedError, LlmRouter, classifyError } from "./router";
import { providersFromEnv } from "./providers";
import type { ChatChunk, ChatClient, ProviderConfig, StreamEvent } from "./types";

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

const textChunks = (...parts: string[]): ChatChunk[] => [
  ...parts.map((content) => ({ choices: [{ delta: { content } }] })),
  { choices: [{ delta: {}, finish_reason: "stop" }] },
];

/** A fake provider: each call to `stream` takes the next scripted behaviour. */
function scripted(behaviours: (ChatChunk[] | Error)[]) {
  const calls: Record<string, unknown>[] = [];
  const client: ChatClient = {
    async *stream(params) {
      calls.push(params);
      const next = behaviours.shift();
      if (!next) throw new Error("no more scripted responses");
      if (next instanceof Error) throw next;
      for (const chunk of next) yield chunk;
    },
  };
  return { client, calls };
}

const config = (id: ProviderConfig["id"], models = [`${id}-model`]): ProviderConfig => ({
  id,
  baseURL: `https://${id}.test`,
  apiKey: "key",
  models,
  supportsTools: true,
  supportsVision: id === "gemini",
});

async function collect(stream: AsyncIterable<StreamEvent>) {
  const events: StreamEvent[] = [];
  for await (const e of stream) events.push(e);
  return events;
}

const noSleep = async () => {};

describe("classifyError", () => {
  it("maps HTTP statuses to a recovery strategy", () => {
    expect(classifyError(httpError(429))).toBe("next-provider");
    expect(classifyError(httpError(401))).toBe("next-provider");
    expect(classifyError(httpError(404))).toBe("next-model");
    expect(classifyError(httpError(503))).toBe("retry");
    expect(classifyError(new Error("socket hang up"))).toBe("retry");
  });
});

describe("LlmRouter", () => {
  it("streams text from the first provider for the task", async () => {
    const gemini = scripted([textChunks("Hello", " Pune")]);
    const router = new LlmRouter({
      providers: [config("gemini"), config("nvidia")],
      clientFor: () => gemini.client,
    });
    const events = await collect(
      router.stream({ task: "chat", messages: [{ role: "user", content: "hi" }] }),
    );
    expect(
      events.filter((e) => e.type === "text").map((e) => (e as { delta: string }).delta),
    ).toEqual(["Hello", " Pune"]);
    expect(events.at(-1)).toEqual({
      type: "finish",
      provider: "gemini",
      model: "gemini-model",
      reason: "stop",
    });
  });

  it("falls back to NVIDIA when Gemini is rate limited", async () => {
    const gemini = scripted([httpError(429)]);
    const nvidia = scripted([textChunks("from nvidia")]);
    const failed = vi.fn();
    const router = new LlmRouter({
      providers: [config("gemini"), config("nvidia")],
      clientFor: (c) => (c.id === "gemini" ? gemini.client : nvidia.client),
      onAttemptFailed: failed,
    });
    const result = await router.complete({
      task: "chat",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result).toMatchObject({ text: "from nvidia", provider: "nvidia" });
    expect(failed).toHaveBeenCalledOnce();
  });

  it("retries a transient error, then tries the next model on 404", async () => {
    const gemini = scripted([httpError(503), httpError(404), textChunks("ok")]);
    const router = new LlmRouter({
      providers: [config("gemini", ["new-model", "old-model"])],
      clientFor: () => gemini.client,
      sleep: noSleep,
    });
    const result = await router.complete({
      task: "chat",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.model).toBe("old-model");
    expect(gemini.calls.map((c) => c.model)).toEqual(["new-model", "new-model", "old-model"]);
  });

  it("routes bulk text to NVIDIA first and skips providers without a key", async () => {
    const nvidia = scripted([textChunks("caption")]);
    const router = new LlmRouter({
      providers: [config("gemini"), { ...config("nvidia"), apiKey: undefined }],
      clientFor: () => nvidia.client,
    });
    expect(router.candidates({ task: "bulk_text" }).map((p) => p.id)).toEqual(["gemini"]);

    const both = new LlmRouter({ providers: [config("gemini"), config("nvidia")] });
    expect(both.candidates({ task: "bulk_text" }).map((p) => p.id)).toEqual(["nvidia", "gemini"]);
    expect(both.candidates({ task: "vision" }).map((p) => p.id)).toEqual(["gemini"]);
  });

  it("assembles tool calls streamed in pieces", async () => {
    const gemini = scripted([
      [
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  { index: 0, id: "call_1", function: { name: "offer_", arguments: '{"que' } },
                ],
              },
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [{ index: 0, function: { name: "options", arguments: 'stion":"x"}' } }],
              },
            },
          ],
        },
        { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
      ],
    ]);
    const router = new LlmRouter({ providers: [config("gemini")], clientFor: () => gemini.client });
    const result = await router.complete({ task: "orchestrate", messages: [] });
    expect(result.toolCalls).toEqual([
      {
        id: "call_1",
        type: "function",
        function: { name: "offer_options", arguments: '{"question":"x"}' },
      },
    ]);
  });

  it("passes provider extras and request options through", async () => {
    const gemini = scripted([textChunks("{}")]);
    const router = new LlmRouter({
      providers: [{ ...config("gemini"), extraBody: { reasoning_effort: "low" } }],
      clientFor: () => gemini.client,
    });
    await router.complete({
      task: "chat",
      messages: [],
      json: true,
      maxTokens: 50,
      temperature: 0.2,
    });
    expect(gemini.calls[0]).toMatchObject({
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      max_tokens: 50,
      temperature: 0.2,
    });
  });

  it("explains when nothing is configured or everything fails", async () => {
    const empty = new LlmRouter({ providers: [] });
    await expect(empty.complete({ task: "chat", messages: [] })).rejects.toThrow(/GEMINI_API_KEY/);

    const gemini = scripted([httpError(429)]);
    const router = new LlmRouter({ providers: [config("gemini")], clientFor: () => gemini.client });
    await expect(router.complete({ task: "chat", messages: [] })).rejects.toBeInstanceOf(
      AllProvidersFailedError,
    );
  });
});

describe("providersFromEnv", () => {
  it("puts env model overrides first and only enables Ollama when configured", () => {
    const providers = providersFromEnv({ GEMINI_API_KEY: "g", GEMINI_MODEL: "my-gemini" });
    expect(providers.map((p) => p.id)).toEqual(["gemini", "nvidia"]);
    expect(providers[0]?.models[0]).toBe("my-gemini");
    expect(providers[1]?.apiKey).toBeUndefined();
    expect(providersFromEnv({ OLLAMA_MODEL: "qwen3:4b" }).map((p) => p.id)).toContain("local");
    // Blank values in .env files fall back to defaults instead of being sent as "".
    const blank = providersFromEnv({
      GEMINI_MODEL: "",
      GEMINI_REASONING_EFFORT: "",
      OLLAMA_MODEL: "",
    });
    expect(blank[0]?.models[0]).toBe("gemini-3.8-flash");
    expect(blank[0]?.extraBody).toEqual({ reasoning_effort: "low" });
    expect(blank.map((p) => p.id)).not.toContain("local");
    expect(providersFromEnv({ GEMINI_REASONING_EFFORT: "off" })[0]?.extraBody).toEqual({});
  });
});
