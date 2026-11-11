import { z } from "zod";
import type { ToolSpec } from "../llm/types";

export type ToolContext = { businessId: string; signal?: AbortSignal };

export type AgentTool<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  input: I;
  output: O;
  /** UI tools (like offer_options) end the turn: the user's tap is the next message. */
  endsTurn?: boolean;
  run: (input: z.output<I>, ctx: ToolContext) => Promise<z.input<O>> | z.input<O>;
};

export function defineTool<I extends z.ZodType, O extends z.ZodType>(tool: AgentTool<I, O>) {
  return tool;
}

/** The tool as the model sees it: name, description and JSON Schema parameters. */
export function toToolSpec(tool: AgentTool): ToolSpec {
  const parameters = z.toJSONSchema(tool.input) as Record<string, unknown>;
  delete parameters.$schema;
  return {
    type: "function",
    function: { name: tool.name, description: tool.description, parameters },
  };
}

export type ToolOutcome =
  | { ok: true; name: string; input: unknown; output: unknown }
  | { ok: false; name: string; error: string };

/**
 * Run one tool call from the model: parse JSON, validate input, run, validate output.
 * Errors are returned (not thrown) so the model can read them and correct itself.
 */
export async function executeTool(
  tools: readonly AgentTool[],
  name: string,
  rawArguments: string,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { ok: false, name, error: `Unknown tool "${name}".` };

  let args: unknown;
  try {
    args = rawArguments.trim() ? JSON.parse(rawArguments) : {};
  } catch {
    return { ok: false, name, error: "Arguments were not valid JSON." };
  }

  const input = tool.input.safeParse(args);
  if (!input.success) {
    return { ok: false, name, error: `Invalid arguments: ${z.prettifyError(input.error)}` };
  }

  try {
    const result = await tool.run(input.data, ctx);
    const output = tool.output.safeParse(result);
    if (!output.success) {
      return {
        ok: false,
        name,
        error: `Tool returned invalid output: ${z.prettifyError(output.error)}`,
      };
    }
    return { ok: true, name, input: input.data, output: output.data };
  } catch (error) {
    return { ok: false, name, error: error instanceof Error ? error.message : "Tool failed." };
  }
}
