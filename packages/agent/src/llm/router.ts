import type { Provider, TaskType } from "../types";
import { DEFAULT_ROUTES, openAIClient } from "./providers";
import type {
  ChatClient,
  LlmStreamer,
  ProviderConfig,
  RouteRequest,
  StreamEvent,
  ToolCall,
} from "./types";

type Attempt = { provider: Provider; model: string; error: string };

export class AllProvidersFailedError extends Error {
  constructor(
    readonly task: TaskType,
    readonly attempts: Attempt[],
  ) {
    super(
      attempts.length === 0
        ? `No model provider is configured for "${task}". Set GEMINI_API_KEY or NVIDIA_API_KEY.`
        : `All providers failed for "${task}": ${attempts.map((a) => `${a.provider}/${a.model}: ${a.error}`).join("; ")}`,
    );
    this.name = "AllProvidersFailedError";
  }
}

type Decision = "retry" | "next-model" | "next-provider";

/** What to do after a failed call, based on the HTTP status (if any). */
export function classifyError(error: unknown): Decision {
  const status = (error as { status?: unknown })?.status;
  if (typeof status !== "number") return "retry"; // network error or timeout
  if (status === 404) return "next-model"; // model id not available on this provider
  if (status >= 500) return "retry";
  return "next-provider"; // 429 rate limit, 401/403 bad key, 400 unsupported request
}

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted) || (error as { name?: string })?.name === "AbortError";
}

export type RouterOptions = {
  providers: ProviderConfig[];
  routes?: Record<TaskType, Provider[]>;
  clientFor?: (config: ProviderConfig) => ChatClient;
  /** Extra attempts on the same model for 5xx/network errors. */
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
  onAttemptFailed?: (attempt: Attempt) => void;
};

/**
 * One OpenAI-compatible entry point for every model call in Snip.
 * Routes by task type, retries transient errors, and falls back to the next provider on
 * rate limits or failures. Switching models is a one-line change in providers.ts or env.
 */
export class LlmRouter implements LlmStreamer {
  private readonly clients = new Map<string, ChatClient>();
  private readonly routes: Record<TaskType, Provider[]>;
  private readonly clientFor: (config: ProviderConfig) => ChatClient;
  private readonly retries: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: RouterOptions) {
    this.routes = options.routes ?? DEFAULT_ROUTES;
    this.clientFor = options.clientFor ?? openAIClient;
    this.retries = options.retries ?? 1;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Providers that can serve this request, in fallback order. */
  candidates(request: Pick<RouteRequest, "task" | "tools">): ProviderConfig[] {
    const order = this.routes[request.task] ?? [];
    return order
      .map((id) => this.options.providers.find((p) => p.id === id))
      .filter((p): p is ProviderConfig => Boolean(p?.apiKey))
      .filter((p) => (request.tools?.length ? p.supportsTools : true))
      .filter((p) => (request.task === "vision" ? p.supportsVision : true));
  }

  async *stream(request: RouteRequest): AsyncGenerator<StreamEvent> {
    const attempts: Attempt[] = [];

    for (const provider of this.candidates(request)) {
      models: for (const model of provider.models) {
        for (let attempt = 0; attempt <= this.retries; attempt++) {
          let emitted = false;
          try {
            for await (const event of this.streamOnce(provider, model, request)) {
              emitted = true;
              yield event;
            }
            return;
          } catch (error) {
            // Once text has reached the user we can't silently switch models mid-answer.
            if (emitted || isAbort(error, request.signal)) throw error;
            const failure = { provider: provider.id, model, error: describe(error) };
            attempts.push(failure);
            this.options.onAttemptFailed?.(failure);

            const decision = classifyError(error);
            if (decision === "next-provider") break models;
            if (decision === "next-model") continue models;
            if (attempt < this.retries) await this.sleep(400 * 2 ** attempt);
          }
        }
        break; // retries exhausted on this model: try the next provider
      }
    }
    throw new AllProvidersFailedError(request.task, attempts);
  }

  /** Non-streaming convenience: collect the whole answer. */
  async complete(request: RouteRequest) {
    let text = "";
    let toolCalls: ToolCall[] = [];
    let provider: Provider | undefined;
    let model = "";
    for await (const event of this.stream(request)) {
      if (event.type === "text") text += event.delta;
      if (event.type === "tool_calls") toolCalls = event.calls;
      if (event.type === "finish") ({ provider, model } = event);
    }
    return { text, toolCalls, provider: provider as Provider, model };
  }

  private async *streamOnce(
    provider: ProviderConfig,
    model: string,
    request: RouteRequest,
  ): AsyncGenerator<StreamEvent> {
    const params: Record<string, unknown> = {
      model,
      messages: request.messages,
      ...(provider.extraBody ?? {}),
    };
    if (request.tools?.length) params.tools = request.tools;
    if (request.temperature !== undefined) params.temperature = request.temperature;
    if (request.maxTokens !== undefined) params.max_tokens = request.maxTokens;
    if (request.json) params.response_format = { type: "json_object" };

    const pending = new Map<number, { id: string; name: string; arguments: string }>();
    let reason: string | null = null;

    for await (const chunk of this.client(provider).stream(params, request.signal)) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;
      if (delta?.content) yield { type: "text", delta: delta.content };
      for (const [i, call] of (delta?.tool_calls ?? []).entries()) {
        const index = call.index ?? i;
        const entry = pending.get(index) ?? { id: "", name: "", arguments: "" };
        if (call.id) entry.id = call.id;
        if (call.function?.name) entry.name += call.function.name;
        if (call.function?.arguments) entry.arguments += call.function.arguments;
        pending.set(index, entry);
      }
      if (choice.finish_reason) reason = choice.finish_reason;
    }

    if (pending.size > 0) {
      const calls: ToolCall[] = [...pending.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, c]) => ({
          id: c.id || `call_${index}`,
          type: "function",
          function: { name: c.name, arguments: c.arguments || "{}" },
        }));
      yield { type: "tool_calls", calls };
    }
    yield { type: "finish", provider: provider.id, model, reason };
  }

  private client(provider: ProviderConfig): ChatClient {
    let client = this.clients.get(provider.id);
    if (!client) {
      client = this.clientFor(provider);
      this.clients.set(provider.id, client);
    }
    return client;
  }
}

function describe(error: unknown): string {
  const status = (error as { status?: unknown })?.status;
  const message = error instanceof Error ? error.message : String(error);
  return typeof status === "number" ? `${status} ${message}` : message;
}
