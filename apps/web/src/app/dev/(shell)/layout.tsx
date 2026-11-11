import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { RecentChatList } from "@/components/app-shell/recent-chats";

/** Development-only previews of app screens with mock data (no Supabase needed). */
export default function DevShellLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <AppShell
      recent={
        <RecentChatList
          chats={[
            { id: "00000000-0000-4000-8000-000000000001", title: "Monsoon menu carousel" },
            { id: "00000000-0000-4000-8000-000000000002", title: "Diwali offer ideas" },
          ]}
        />
      }
      account={
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-500 font-semibold text-ink">
            C
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-paper">Chai Point</p>
            <p className="truncate text-xs text-muted-on-ink">asha@example.com</p>
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
