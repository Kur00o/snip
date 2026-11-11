import { encodeSSE } from "@/lib/sse";

/**
 * Development-only mock of /api/chat so the chat UI can be previewed without a session
 * or API keys. Returns 404 in production.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const { message } = (await request.json()) as { message: string };
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const firstTurn = !/carousel/i.test(message);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encodeSSE("meta", { conversationId: "00000000-0000-4000-8000-000000000001" }),
      );
      await wait(500);
      const text = firstTurn
        ? "Love it, the monsoon menu deserves a proper launch. Quick one:"
        : "Here's a 5-slide **Instagram carousel** for Chai Point:\n\n1. **The monsoon menu is here** – Rainy evenings just got cosier.\n2. **Masala chai + vada pav** – Hot, crisp, ₹[price] till 7pm.\n3. **Kanda bhaji platter** – Made to share (or not).\n4. **Ginger lemon honey tea** – For the sniffles season.\n5. **Come in from the rain** – FC Road, open till 11pm.\n\nCaption: Rain outside, chai inside ☕ Our monsoon menu is finally here.\n\n#punecafe #monsoonvibes #chailovers #fcroad #punefoodie";
      for (const word of text.split(/(?<= )/)) {
        controller.enqueue(encodeSSE("delta", { text: word }));
        await wait(25);
      }
      if (firstTurn) {
        const output = {
          question: "Where should this go?",
          options: [
            { label: "Instagram carousel", reply: "Make it an Instagram carousel" },
            { label: "Reel", reply: "Make it a Reel" },
            { label: "Single post", reply: "Make it a single post" },
          ],
        };
        controller.enqueue(
          encodeSSE("tool", { ok: true, name: "offer_options", input: output, output }),
        );
      }
      controller.enqueue(encodeSSE("done", { messageId: null, provider: "gemini", model: "mock" }));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8" } });
}
