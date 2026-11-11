/**
 * Server-Sent Events over a POST response (EventSource only supports GET, so the client
 * reads the stream with fetch). Events: meta, delta, tool, done, error.
 */
export type ChatStreamEvent =
  | { event: "meta"; data: { conversationId: string } }
  | { event: "delta"; data: { text: string } }
  | { event: "tool"; data: ToolOutcomeData }
  | {
      event: "done";
      data: { messageId: string | null; provider: string | null; model: string | null };
    }
  | { event: "error"; data: { message: string } };

export type ToolOutcomeData =
  | { ok: true; name: string; input: unknown; output: unknown }
  | { ok: false; name: string; error: string };

const encoder = new TextEncoder();

export function encodeSSE<E extends ChatStreamEvent>(
  event: E["event"],
  data: E["data"],
): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Parse an SSE byte stream into events, coping with chunks that split mid-line. */
export async function* readSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer = (buffer + decoder.decode(value, { stream: true })).replaceAll("\r\n", "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseBlock(block);
        if (parsed) yield parsed;
        boundary = buffer.indexOf("\n\n");
      }
    }
    const tail = parseBlock(buffer);
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(block: string): { event: string; data: string } | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue; // comment / keep-alive
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  return data.length ? { event, data: data.join("\n") } : null;
}
