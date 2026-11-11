import { describe, expect, it } from "vitest";
import { Provider, TaskType, ToolName, TOOL_NAMES } from "./index";

describe("agent vocabulary", () => {
  it("exposes the six FigJam tools plus the brand context loader", () => {
    expect(TOOL_NAMES).toHaveLength(7);
    expect(ToolName.parse("plan_carousel")).toBe("plan_carousel");
  });

  it("rejects unknown tools, task types and providers", () => {
    expect(ToolName.safeParse("post_to_tiktok").success).toBe(false);
    expect(TaskType.safeParse("image_gen").success).toBe(false);
    expect(Provider.safeParse("openai").success).toBe(false);
  });
});
