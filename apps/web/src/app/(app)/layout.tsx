import { Suspense, type ReactNode } from "react";
import { AccountMenu, AccountMenuSkeleton } from "@/components/app-shell/account-menu";
import { AppShell } from "@/components/app-shell/app-shell";
import { RecentChats } from "@/components/app-shell/recent-chats";

/**
 * The chrome is static and prerendered; anything that reads the session (account menu,
 * page content) streams in behind its own Suspense boundary.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      account={
        <Suspense fallback={<AccountMenuSkeleton />}>
          <AccountMenu />
        </Suspense>
      }
      recent={
        <Suspense fallback={null}>
          <RecentChats />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
