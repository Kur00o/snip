import type { Provider, TaskType } from "../types";

/** OpenAI-compatible chat message (works for Gemini, NVIDIA and Ollama). */
export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

/** A tool as the model sees it (JSON Schema parameters). */
export type ToolSpec = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type RouteRequest = {
  task: TaskType;
  messages: ChatMessage[];
  tools?: ToolSpec[];
  temperature?: number;
  maxTokens?: number;
  /** Ask for a JSON object response. */
  json?: boolean;
  signal?: AbortSignal;
};

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "finish"; provider: Provider; model: string; reason: string | null };

/** Anything that can stream a routed completion (the router, or a fake in tests). */
export interface LlmStreamer {
  stream(request: RouteRequest): AsyncIterable<StreamEvent>;
}

/** Minimal shape of an OpenAI-compatible streaming chunk. */
export type ChatChunk = {
  choices?: {
    delta?: {
      content?: string | null;
      tool_calls?: {
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
    finish_reason?: string | null;
  }[];
};

/** One provider endpoint. `stream` throws errors that carry an HTTP `status` when known. */
export interface ChatClient {
  stream(params: Record<string, unknown>, signal?: AbortSignal): AsyncIterable<ChatChunk>;
}

export type ProviderConfig = {
  id: Provider;
  baseURL: string;
  apiKey: string | undefined;
  /** Tried in order; a 404 (unknown model) moves to the next one. */
  models: string[];
  supportsTools: boolean;
  supportsVision: boolean;
  /** Provider-specific request fields, e.g. Gemini's reasoning_effort. */
  extraBody?: Record<string, unknown>;
};
