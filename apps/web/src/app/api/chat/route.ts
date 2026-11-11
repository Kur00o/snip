import {
  AllProvidersFailedError,
  describeCarousel,
  historyFromRows,
  loadBrandContext,
  runAgent,
} from "@snip/agent";
import type { Json } from "@snip/db";
import { z } from "zod";
import { getRouter, supabaseBrandSource } from "@/lib/agent";
import { getMyBusiness, getSessionUser } from "@/lib/auth";
import { supabaseAgentServices } from "@/lib/carousel";
import { encodeSSE, type ToolOutcomeData } from "@/lib/sse";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const Body = z.object({
  conversationId: z.uuid().optional(),
  /** Set by the carousel studio: the post being edited. */
  postId: z.uuid().optional(),
  message: z
    .string()
    .trim()
    .min(1, "Type a message")
    .max(2000, "Keep messages under 2,000 characters"),
});

/** Free-tier friendly: at most this many messages per business per minute. */
const MAX_MESSAGES_PER_MINUTE = 8;

const json = (status: number, error: string) => Response.json({ error }, { status });

/**
 * Chat endpoint. Saves the user's message, runs one agent turn and streams it back as
 * Server-Sent Events, then saves the assistant's reply with the model that wrote it.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return json(401, "Please sign in again.");
  const business = await getMyBusiness();
  if (!business?.onboarding_done) return json(403, "Finish setting up your brand first.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, parsed.error.issues[0]?.message ?? "Invalid message");
  const { message } = parsed.data;

  const supabase = await createClient();

  const since = new Date(Date.now() - 60_000).toISOString();
  const recent = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("role", "user")
    .gte("created_at", since);
  if ((recent.count ?? 0) >= MAX_MESSAGES_PER_MINUTE) {
    return json(429, "You're going fast! Give Snip a few seconds and try again.");
  }

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!data) return json(404, "That chat no longer exists.");
  } else {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ business_id: business.id, title: titleFrom(message) })
      .select("id")
      .single();
    if (error) return json(500, "Couldn't start a new chat. Please try again.");
    conversationId = data.id;
  }

  const { data: rows } = await supabase
    .from("messages")
    .select("role, content, tool_calls")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);
  const history = historyFromRows((rows ?? []).reverse());

  const saved = await supabase.from("messages").insert({
    conversation_id: conversationId,
    business_id: business.id,
    role: "user",
    content: message,
  });
  if (saved.error) return json(500, "Couldn't save your message. Please try again.");

  const brand = await loadBrandContext(supabaseBrandSource(supabase, business));
  const services = supabaseAgentServices(supabase, business, conversationId);

  // The carousel this chat is about: the studio's post, or the latest one made in this chat.
  let activePostId = parsed.data.postId ?? null;
  if (!activePostId) {
    const { data: latest } = await supabase
      .from("posts")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("type", "carousel")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activePostId = latest?.id ?? null;
  }
  const active = activePostId ? await services.getCarousel(activePostId) : null;
  const convId = conversationId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (...args: Parameters<typeof encodeSSE>) => {
        try {
          controller.enqueue(encodeSSE(...args));
        } catch {
          // client went away
        }
      };
      send("meta", { conversationId: convId });

      try {
        for await (const event of runAgent({
          llm: getRouter(),
          brand,
          businessId: business.id,
          services,
          activeCarousel: active ? describeCarousel(active) : null,
          history,
          userMessage: message,
          signal: request.signal,
        })) {
          if (event.type === "text") send("delta", { text: event.delta });
          else if (event.type === "tool") send("tool", event.outcome as ToolOutcomeData);
          else {
            const { data: assistant } = await supabase
              .from("messages")
              .insert({
                conversation_id: convId,
                business_id: business.id,
                role: "assistant",
                content: event.text || null,
                tool_calls: event.tools.length ? (event.tools as unknown as Json) : null,
                model_used: event.provider,
              })
              .select("id")
              .single();
            await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", convId);
            send("done", {
              messageId: assistant?.id ?? null,
              provider: event.provider,
              model: event.model,
            });
          }
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("[chat] agent turn failed", error);
          send("error", { message: friendlyError(error) });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function titleFrom(message: string): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  if (oneLine.length <= 60) return oneLine;
  const cut = oneLine.slice(0, 60);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : 60)}…`;
}

function friendlyError(error: unknown): string {
  if (error instanceof AllProvidersFailedError && error.attempts.length === 0) {
    return "Snip's AI isn't connected yet. Add GEMINI_API_KEY or NVIDIA_API_KEY to the server's environment variables.";
  }
  return "Snip's AI is busy right now (free-tier limits). Please try again in a minute.";
}
