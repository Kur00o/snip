import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./routes";
import { encodeSSE, readSSE } from "./sse";

function streamOf(...chunks: (string | Uint8Array)[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === "string" ? encoder.encode(c) : c);
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const out: { event: string; data: string }[] = [];
  for await (const e of readSSE(stream)) out.push(e);
  return out;
}

describe("SSE", () => {
  it("round-trips encoded events", async () => {
    const events = await collect(
      streamOf(
        encodeSSE("meta", { conversationId: "c1" }),
        encodeSSE("delta", { text: "Hello\nworld" }),
        encodeSSE("done", { messageId: "m1", provider: "gemini", model: "x" }),
      ),
    );
    expect(events.map((e) => e.event)).toEqual(["meta", "delta", "done"]);
    expect(JSON.parse(events[1]!.data)).toEqual({ text: "Hello\nworld" });
  });

  it("handles events split across chunks, comments and CRLF", async () => {
    const events = await collect(
      streamOf(
        ": keep-alive\r\n\r\nevent: del",
        'ta\r\ndata: {"te',
        'xt":"hi"}\r\n\r\n',
        "data: tail",
      ),
    );
    expect(events).toEqual([
      { event: "delta", data: '{"text":"hi"}' },
      { event: "message", data: "tail" },
    ]);
  });
});

describe("chat routes", () => {
  it("are protected", () => {
    expect(isProtectedPath("/chat/123")).toBe(true);
    expect(isProtectedPath("/api/chat")).toBe(false); // the API answers 401 itself
  });
});
