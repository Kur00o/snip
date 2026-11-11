"use client";

import { useCallback, useRef, useState } from "react";
import { readSSE, type ToolOutcomeData } from "@/lib/sse";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools: ToolOutcomeData[];
  status: "streaming" | "done" | "error";
  error?: string;
};

type Options = {
  endpoint?: string;
  conversationId?: string | null;
  initialMessages?: UiMessage[];
  onConversation?: (id: string) => void;
  /** Extra fields sent with every message, e.g. { postId } from the studio. */
  extraBody?: Record<string, string>;
  /** Called after each completed reply (used by the studio to reload slides). */
  onTurnDone?: (message: UiMessage) => void;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Client side of the streaming chat: optimistic user message, live assistant reply. */
export function useChat({
  endpoint = "/api/chat",
  conversationId: initialId = null,
  initialMessages = [],
  onConversation,
  extraBody,
  onTurnDone,
}: Options) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialId);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef(initialId);

  const send = useCallback(
    async (text: string) => {
      const patch = (id: string, change: (m: UiMessage) => UiMessage) =>
        setMessages((all) => all.map((m) => (m.id === id ? change(m) : m)));
      const message = text.trim();
      if (!message || abortRef.current) return;

      const assistantId = newId();
      setMessages((all) => [
        ...all,
        { id: newId(), role: "user", content: message, tools: [], status: "done" },
        { id: assistantId, role: "assistant", content: "", tools: [], status: "streaming" },
      ]);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const fail = (error: string) => patch(assistantId, (m) => ({ ...m, status: "error", error }));
      // Local copy of the reply, so callbacks never run inside a state updater.
      let reply: UiMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        tools: [],
        status: "streaming",
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            ...extraBody,
            ...(conversationRef.current ? { conversationId: conversationRef.current } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          fail(body?.error ?? "Something went wrong. Please try again.");
          return;
        }

        for await (const { event, data } of readSSE(response.body)) {
          const payload = JSON.parse(data) as Record<string, unknown>;
          if (event === "meta" && typeof payload.conversationId === "string") {
            if (!conversationRef.current) {
              conversationRef.current = payload.conversationId;
              setConversationId(payload.conversationId);
              onConversation?.(payload.conversationId);
            }
          } else if (event === "delta" && typeof payload.text === "string") {
            const delta = payload.text;
            reply = { ...reply, content: reply.content + delta };
            patch(assistantId, (m) => ({ ...m, content: m.content + delta }));
          } else if (event === "tool") {
            const tool = payload as ToolOutcomeData;
            reply = { ...reply, tools: [...reply.tools, tool] };
            patch(assistantId, (m) => ({ ...m, tools: [...m.tools, tool] }));
          } else if (event === "done") {
            reply = { ...reply, status: "done" };
            patch(assistantId, (m) => ({ ...m, status: "done" }));
            onTurnDone?.(reply);
          } else if (event === "error") {
            fail(typeof payload.message === "string" ? payload.message : "Something went wrong.");
          }
        }
        // Stream ended without "done" (e.g. connection dropped): keep what arrived.
        patch(assistantId, (m) => (m.status === "streaming" ? { ...m, status: "done" } : m));
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") {
          patch(assistantId, (m) => ({ ...m, status: "done", content: m.content || "Stopped." }));
        } else {
          fail("Couldn't reach Snip. Check your connection and try again.");
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [endpoint, onConversation, extraBody, onTurnDone],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Re-send the user message before a failed reply. */
  const retry = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((all) =>
      all.filter((m) => !(m.role === "assistant" && m.status === "error")).slice(0, -1),
    );
    void send(lastUser.content);
  }, [messages, send]);

  return { messages, conversationId, busy, send, stop, retry };
}

export type ChatController = ReturnType<typeof useChat>;
