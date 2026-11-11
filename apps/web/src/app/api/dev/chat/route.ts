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
        : "Your monsoon carousel is ready. I kept the price as [price] on slide 2, so add it in the studio.";
      for (const word of text.split(/(?<= )/)) {
        controller.enqueue(encodeSSE("delta", { text: word }));
        await wait(25);
      }
      if (!firstTurn) {
        const plan = {
          postId: "00000000-0000-4000-8000-000000000009",
          title: "Monsoon menu launch",
          slides: [
            { headline: "The monsoon menu is here", body: "" },
            { headline: "Masala chai + vada pav", body: "" },
            { headline: "Kanda bhaji platter", body: "" },
            { headline: "Ginger lemon honey", body: "" },
            { headline: "Come in from the rain", body: "" },
          ],
        };
        controller.enqueue(
          encodeSSE("tool", { ok: true, name: "plan_carousel", input: {}, output: plan }),
        );
        const caption = {
          postId: plan.postId,
          caption:
            "Rain outside, chai inside ☕\nOur monsoon menu is finally here. Come in from the rain this week.",
          hashtags: ["#punecafe", "#monsoonvibes", "#chailovers", "#fcroad", "#punefoodie"],
        };
        controller.enqueue(
          encodeSSE("tool", {
            ok: true,
            name: "write_caption_and_hashtags",
            input: {},
            output: caption,
          }),
        );
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
