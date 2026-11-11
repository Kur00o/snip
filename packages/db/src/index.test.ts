import { describe, expect, it } from "vitest";
import { businessPath, JobKind, PostStatus } from "./index";

const BIZ = "3f2c8a1e-5b6d-4c7e-9f00-1a2b3c4d5e6f";

describe("businessPath", () => {
  it("joins safe segments under the business folder", () => {
    expect(businessPath(BIZ, "reels", "r1", "take-1.mp4")).toBe(`${BIZ}/reels/r1/take-1.mp4`);
  });

  it("rejects traversal, slashes and bad ids", () => {
    expect(() => businessPath(BIZ, "..", "x.png")).toThrow();
    expect(() => businessPath(BIZ, "a/b.png")).toThrow();
    expect(() => businessPath(BIZ)).toThrow();
    expect(() => businessPath("not-a-uuid", "logo.png")).toThrow();
  });
});

describe("vocabularies", () => {
  it("match the database check constraints", () => {
    expect(PostStatus.options).toEqual([
      "draft",
      "review",
      "approved",
      "scheduled",
      "published",
      "failed",
    ]);
    expect(JobKind.safeParse("publish").success).toBe(true);
    expect(JobKind.safeParse("render_video").success).toBe(false);
  });
});
