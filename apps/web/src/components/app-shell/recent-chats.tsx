import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { getMyBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Latest chats in the sidebar. Reads the session, so it streams in behind Suspense. */
export async function RecentChats() {
  const business = await getMyBusiness();
  if (!business) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, title")
    .order("updated_at", { ascending: false })
    .limit(6);

  return <RecentChatList chats={data ?? []} />;
}

export function RecentChatList({ chats }: { chats: { id: string; title: string | null }[] }) {
  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center justify-between px-3">
        <p className="text-xs font-medium tracking-wide text-muted-on-ink uppercase">Recent</p>
        <Link
          href="/home"
          className="grid size-6 place-items-center rounded-md text-muted-on-ink transition-colors hover:bg-white/10 hover:text-paper"
          aria-label="New chat"
          title="New chat"
        >
          <Plus aria-hidden className="size-3.5" />
        </Link>
      </div>
      {chats.length === 0 ? (
        <p className="px-3 text-sm text-muted-on-ink/80">Your chats will show up here.</p>
      ) : (
        <ul className="space-y-0.5">
          {chats.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-on-ink transition-colors hover:bg-white/5 hover:text-paper"
              >
                <MessageSquare aria-hidden className="size-3.5 shrink-0 opacity-70" />
                <span className="truncate">{c.title || "Untitled chat"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
