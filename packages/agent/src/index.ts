/**
 * @snip/agent: the brain of Snip.
 * Rule: UI code never calls a model provider directly; every LLM call goes through LlmRouter.
 */
export { TASK_TYPES, TaskType, TOOL_NAMES, ToolName, PROVIDERS, Provider } from "./types";

export type {
  ChatMessage,
  ToolCall,
  ToolSpec,
  RouteRequest,
  StreamEvent,
  LlmStreamer,
  ChatClient,
  ChatChunk,
  ProviderConfig,
} from "./llm/types";
export {
  LlmRouter,
  AllProvidersFailedError,
  classifyError,
  type RouterOptions,
} from "./llm/router";
export { providersFromEnv, openAIClient, DEFAULT_ROUTES } from "./llm/providers";

export {
  BrandContext,
  loadBrandContext,
  renderBrandContext,
  type BrandContextSource,
} from "./brand/context";
export {
  systemPrompt,
  PHASE_4_CAPABILITIES,
  CURRENT_CAPABILITIES,
  type Capabilities,
} from "./prompts/system";
export {
  SlideRecord,
  describeCarousel,
  type AgentServices,
  type CarouselDraft,
  type CarouselSnapshot,
} from "./services";
export { completeJson, extractJson, InvalidModelOutputError } from "./llm/json";
export { planCarousel, planToSlides, CarouselPlan, PlanCarouselInput } from "./tools/plan-carousel";
export { writeCaption, normaliseHashtag, buildCaptionSchema } from "./tools/caption";
export { editCarousel, EditCarouselInput } from "./tools/edit-carousel";

export {
  defineTool,
  executeTool,
  toToolSpec,
  type AgentTool,
  type ToolContext,
  type ToolOutcome,
} from "./tools/define";
export { offerOptions, OfferOptionsInput } from "./tools/offer-options";

export {
  runAgent,
  historyFromRows,
  DEFAULT_TOOLS,
  type AgentEvent,
  type RunAgentOptions,
} from "./orchestrator";
