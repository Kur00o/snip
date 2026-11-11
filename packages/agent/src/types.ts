import { z } from "zod";

/**
 * What kind of work an LLM call is doing. The router (Phase 4) picks a provider per task type:
 * - orchestrate / chat / vision → Gemini free tier
 * - bulk_text (captions, hashtags, scripts) → NVIDIA API Catalogue free tier
 * - tagging / formatting → local Ollama model when available (optional)
 */
export const TASK_TYPES = ["orchestrate", "chat", "vision", "bulk_text", "tagging"] as const;
export const TaskType = z.enum(TASK_TYPES);
export type TaskType = z.infer<typeof TaskType>;

/** Model providers behind the OpenAI-compatible router. Matches messages.model_used. */
export const PROVIDERS = ["gemini", "nvidia", "local"] as const;
export const Provider = z.enum(PROVIDERS);
export type Provider = z.infer<typeof Provider>;

/** Tools the orchestrator can call (FigJam section 4, "Agent Layer"). */
export const TOOL_NAMES = [
  "plan_carousel",
  "write_caption_and_hashtags",
  "make_script_and_shot_list",
  "plan_reel_edit",
  "schedule_post",
  "summarise_insights",
  "load_brand_context",
] as const;
export const ToolName = z.enum(TOOL_NAMES);
export type ToolName = z.infer<typeof ToolName>;
