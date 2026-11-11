import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ChatScreen } from "@/components/chat/chat-screen";
import type { UiMessage } from "@/components/chat/use-chat";
import { HomeSkeleton } from "@/components/home/home-view";
import { requireBusiness } from "@/lib/auth";
import type { ToolOutcomeData } from "@/lib/sse";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage({ params }: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Chat params={params} />
    </Suspense>
  );
}

async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireBusiness();

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const { data: rows } = await supabase
    .from("messages")
    .select("id, role, content, tool_calls")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  const messages: UiMessage[] = (rows ?? [])
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      id: r.id,
      role: r.role as UiMessage["role"],
      content: r.content ?? "",
      tools: Array.isArray(r.tool_calls) ? (r.tool_calls as unknown as ToolOutcomeData[]) : [],
      status: "done",
    }));

  return <ChatScreen key={id} conversationId={id} initialMessages={messages} />;
}
