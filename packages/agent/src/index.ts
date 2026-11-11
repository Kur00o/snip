/**
 * @snip/agent — the brain of Snip.
 *
 * Phase 1 only defines the shared vocabulary (task types and tool names).
 * The LLM router lands in Phase 4 and each tool lands in the phase that needs it.
 * Rule: UI code never calls a model provider directly; everything goes through this package.
 */
export { TASK_TYPES, TaskType, TOOL_NAMES, ToolName, PROVIDERS, Provider } from "./types";
