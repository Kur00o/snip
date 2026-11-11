import OpenAI from "openai";
import type { Provider, TaskType } from "../types";
import type { ChatChunk, ChatClient, ProviderConfig } from "./types";

type Env = Record<string, string | undefined>;

const unique = (values: (string | undefined)[]) => [
  ...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v))),
];

/**
 * Provider settings from environment variables. Model ids change often, so each provider
 * has an env override first and known-good fallbacks after it.
 */
export function providersFromEnv(env: Env): ProviderConfig[] {
  const providers: ProviderConfig[] = [
    {
      id: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: env.GEMINI_API_KEY,
      models: unique([env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-2.5-flash"]),
      supportsTools: true,
      supportsVision: true,
      extraBody: geminiExtras(env.GEMINI_REASONING_EFFORT),
    },
    {
      id: "nvidia",
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: env.NVIDIA_API_KEY,
      models: unique([
        env.NVIDIA_MODEL,
        "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        "meta/llama-3.1-70b-instruct",
      ]),
      supportsTools: true,
      supportsVision: false,
    },
  ];
  if (env.OLLAMA_MODEL) {
    providers.push({
      id: "local",
      baseURL: env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: "ollama",
      models: [env.OLLAMA_MODEL],
      supportsTools: true,
      supportsVision: false,
    });
  }
  return providers;
}

/** Empty means the default ("low"); "off" sends no reasoning setting at all. */
function geminiExtras(effort: string | undefined): Record<string, unknown> {
  const value = effort?.trim() || "low";
  return value === "off" ? {} : { reasoning_effort: value };
}

/** Which providers serve which kind of work, in fallback order. */
export const DEFAULT_ROUTES: Record<TaskType, Provider[]> = {
  orchestrate: ["gemini", "nvidia", "local"],
  chat: ["gemini", "nvidia", "local"],
  vision: ["gemini"],
  bulk_text: ["nvidia", "gemini", "local"],
  tagging: ["local", "nvidia", "gemini"],
};

/** Real client: the OpenAI SDK pointed at any OpenAI-compatible base URL. */
export function openAIClient(config: ProviderConfig): ChatClient {
  const client = new OpenAI({
    apiKey: config.apiKey ?? "not-set",
    baseURL: config.baseURL,
    timeout: 60_000,
    maxRetries: 0, // the router owns retries and fallback
  });
  return {
    async *stream(params, signal) {
      const body = {
        ...params,
        stream: true,
      } as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming;
      const stream = await client.chat.completions.create(body, { signal });
      for await (const chunk of stream) yield chunk as ChatChunk;
    },
  };
}
