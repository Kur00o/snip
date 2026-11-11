import type { BrandContext } from "./brand/context";
import type { ChatMessage, LlmStreamer, ToolCall } from "./llm/types";
import { systemPrompt, type Capabilities } from "./prompts/system";
import type { AgentServices } from "./services";
import type { Provider } from "./types";
import { executeTool, toToolSpec, type AgentTool, type ToolOutcome } from "./tools/define";
import { writeCaption } from "./tools/caption";
import { editCarousel } from "./tools/edit-carousel";
import { offerOptions } from "./tools/offer-options";
import { planCarousel } from "./tools/plan-carousel";

export const DEFAULT_TOOLS: AgentTool[] = [
  offerOptions,
  planCarousel,
  writeCaption,
  editCarousel,
] as AgentTool[];

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; outcome: ToolOutcome }
  | {
      type: "done";
      text: string;
      provider: Provider | null;
      model: string | null;
      tools: ToolOutcome[];
    };

export type RunAgentOptions = {
  llm: LlmStreamer;
  brand: BrandContext;
  businessId: string;
  services: AgentServices;
  /** Text description of the carousel being worked on in this chat, if any. */
  activeCarousel?: string | null;
  /** Earlier turns, oldest first, already trimmed to a sensible window. */
  history: ChatMessage[];
  userMessage: string;
  tools?: AgentTool[];
  capabilities?: Capabilities;
  maxSteps?: number;
  signal?: AbortSignal;
};

/**
 * One chat turn. Streams text as it arrives, runs any tool calls (validated in and out),
 * feeds results back to the model, and stops when the model answers or a UI tool such as
 * offer_options hands the turn back to the user.
 */
export async function* runAgent(options: RunAgentOptions): AsyncGenerator<AgentEvent> {
  const tools = options.tools ?? DEFAULT_TOOLS;
  const specs = tools.map(toToolSpec);
  const maxSteps = options.maxSteps ?? 4;
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt(
        options.brand,
        options.capabilities,
        new Date(),
        options.activeCarousel,
      ),
    },
    ...options.history,
    { role: "user", content: options.userMessage },
  ];

  let fullText = "";
  let provider: Provider | null = null;
  let model: string | null = null;
  const outcomes: ToolOutcome[] = [];

  for (let step = 0; step < maxSteps; step++) {
    let stepText = "";
    let calls: ToolCall[] = [];

    for await (const event of options.llm.stream({
      task: "orchestrate",
      messages,
      tools: specs,
      signal: options.signal,
    })) {
      if (event.type === "text") {
        stepText += event.delta;
        yield { type: "text", delta: event.delta };
      } else if (event.type === "tool_calls") {
        calls = event.calls;
      } else {
        provider = event.provider;
        model = event.model;
      }
    }
    fullText += stepText;

    if (calls.length === 0) break;

    messages.push({ role: "assistant", content: stepText || null, tool_calls: calls });
    let endTurn = false;
    for (const call of calls) {
      const outcome = await executeTool(tools, call.function.name, call.function.arguments, {
        businessId: options.businessId,
        llm: options.llm,
        brand: options.brand,
        services: options.services,
        signal: options.signal,
      });
      outcomes.push(outcome);
      yield { type: "tool", outcome };
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(outcome.ok ? outcome.output : { error: outcome.error }),
      });
      if (outcome.ok && tools.find((t) => t.name === outcome.name)?.endsTurn) endTurn = true;
    }
    if (endTurn) break;
  }

  yield { type: "done", text: fullText, provider, model, tools: outcomes };
}

/**
 * Turn stored chat rows into model history. Tool details are summarised in text so any
 * provider can read them, and the window is capped to keep free-tier prompts small.
 */
export function historyFromRows(
  rows: { role: string; content: string | null; tool_calls: unknown }[],
  maxMessages = 20,
): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const row of rows.slice(-maxMessages)) {
    if (row.role === "user" && row.content) out.push({ role: "user", content: row.content });
    if (row.role === "assistant") {
      const notes = summariseTools(row.tool_calls);
      const content = [row.content, notes].filter(Boolean).join("\n\n");
      if (content) out.push({ role: "assistant", content });
    }
  }
  return out;
}

type StoredOutcome = {
  ok?: boolean;
  name?: string;
  output?: {
    question?: string;
    options?: { label: string }[];
    postId?: string;
    title?: string;
    slides?: { headline: string }[];
    changed?: number[];
    caption?: string;
  };
};

function summariseTools(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return (value as StoredOutcome[])
    .map((t) => {
      const o = t?.output;
      if (!t?.ok || !t.name) return "";
      if (t.name === "offer_options" && o?.options) {
        return `[I asked: ${o.question} Options: ${o.options.map((x) => x.label).join(" / ")}]`;
      }
      if (t.name === "plan_carousel" && o?.postId) {
        return `[Created carousel ${o.postId} "${o.title ?? ""}": ${(o.slides ?? []).map((s, i) => `${i + 1}. ${s.headline}`).join(" ")}]`;
      }
      if (t.name === "edit_carousel" && o?.postId) {
        return `[Edited carousel ${o.postId}, slides ${(o.changed ?? []).join(", ")}]`;
      }
      if (t.name === "write_caption_and_hashtags") {
        return `[Wrote caption${o?.postId ? ` for ${o.postId}` : ""}: ${(o?.caption ?? "").slice(0, 120)}]`;
      }
      return `[Used ${t.name}]`;
    })
    .filter(Boolean)
    .join("\n");
}
