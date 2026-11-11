import { z } from "zod";
import type { TaskType } from "../types";
import type { ChatMessage, LlmStreamer } from "./types";

/** Pull the JSON object out of a model reply: drops <think> blocks and ``` fences. */
export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in the reply.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export class InvalidModelOutputError extends Error {
  constructor(readonly details: string) {
    super(`The model's answer didn't match the expected format: ${details}`);
    this.name = "InvalidModelOutputError";
  }
}

type JsonRequest<S extends z.ZodType> = {
  task: TaskType;
  system: string;
  user: string;
  schema: S;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
};

/**
 * Ask for JSON, validate it with Zod, and give the model one chance to fix mistakes by
 * showing it the validation error. Every tool that generates content goes through this.
 */
export async function completeJson<S extends z.ZodType>(
  llm: LlmStreamer,
  request: JsonRequest<S>,
): Promise<z.output<S>> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${request.system}\n\nReply with a single JSON object and nothing else.`,
    },
    { role: "user", content: request.user },
  ];

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let text = "";
    for await (const event of llm.stream({
      task: request.task,
      messages,
      json: true,
      signal: request.signal,
      maxTokens: request.maxTokens ?? 2000,
      temperature: request.temperature ?? 0.7,
    })) {
      if (event.type === "text") text += event.delta;
    }

    try {
      const result = request.schema.safeParse(extractJson(text));
      if (result.success) return result.data;
      lastError = z.prettifyError(result.error);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Invalid JSON";
    }
    messages.push(
      { role: "assistant", content: text },
      {
        role: "user",
        content: `That didn't validate:\n${lastError}\nReply with the corrected JSON object only.`,
      },
    );
  }
  throw new InvalidModelOutputError(lastError);
}
