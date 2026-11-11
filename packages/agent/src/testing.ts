/** Test doubles shared by the agent's unit tests. Not exported from the package. */
import { BrandContext } from "./brand/context";
import type { LlmStreamer, RouteRequest, StreamEvent } from "./llm/types";
import type { AgentServices, CarouselSnapshot, SlideRecord } from "./services";
import type { ToolContext } from "./tools/define";

export const testBrand = BrandContext.parse({
  businessName: "Chai Point",
  category: "Café",
  city: "Pune",
  audience: "Students near FC Road",
  goals: ["Grow followers"],
  tone: "friendly",
  colours: { primary: "#0F9D8F", accent: "#C6F432" },
  fonts: { heading: "Fraunces" },
  hasLogo: false,
  bannedWords: ["cheap"],
});

export const finish: StreamEvent = {
  type: "finish",
  provider: "gemini",
  model: "gemini-test",
  reason: "stop",
};

/** Fake LLM: each call replays the next scripted step and records the request. */
export function fakeLlm(steps: (StreamEvent[] | string)[]) {
  const requests: RouteRequest[] = [];
  const llm: LlmStreamer = {
    async *stream(request) {
      requests.push(structuredClone({ ...request, signal: undefined }));
      const step = steps.shift() ?? [];
      const events: StreamEvent[] =
        typeof step === "string" ? [{ type: "text", delta: step }, finish] : step;
      for (const event of events) yield event;
    },
  };
  return { llm, requests };
}

/** In-memory AgentServices. */
export function fakeServices(initial: CarouselSnapshot[] = []) {
  const posts = new Map(initial.map((p) => [p.postId, structuredClone(p)]));
  let next = posts.size + 1;
  const services: AgentServices = {
    async createCarousel(draft) {
      const postId = `post-${next++}`;
      posts.set(postId, {
        postId,
        title: draft.title,
        caption: null,
        hashtags: [],
        slides: draft.slides,
      });
      return { postId };
    },
    async getCarousel(postId) {
      const p = posts.get(postId);
      return p ? structuredClone(p) : null;
    },
    async updateSlides(postId, slides: SlideRecord[]) {
      const p = posts.get(postId);
      if (!p) throw new Error("missing");
      p.slides = slides;
    },
    async saveCaption(postId, caption, hashtags) {
      const p = posts.get(postId);
      if (!p) throw new Error("missing");
      Object.assign(p, { caption, hashtags });
    },
  };
  return { services, posts };
}

export function toolContext(llm: LlmStreamer, services: AgentServices): ToolContext {
  return { businessId: "b1", llm, brand: testBrand, services };
}
