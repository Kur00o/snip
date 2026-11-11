import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MobileSignOut } from "./account-menu";
import { SidebarNav, TabBar } from "./nav-links";

/**
 * Dashboard chrome: ink sidebar on desktop, top bar + bottom tabs on mobile.
 * `account` is the sidebar's account card, passed in so it can stream separately.
 */
export function AppShell({ account, children }: { account: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="relative isolate hidden w-64 shrink-0 flex-col overflow-hidden bg-ink px-4 py-6 text-paper md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-20 -z-10 size-80 rounded-full opacity-60 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, rgb(15 157 143 / 0.55), transparent)",
          }}
        />
        <Link href="/home" className="mb-8 px-3" aria-label="Snip home">
          <BrandMark onDark />
        </Link>
        <nav aria-label="Main" className="flex-1">
          <SidebarNav />
        </nav>
        {account}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-5 backdrop-blur md:hidden">
          <Link href="/home" aria-label="Snip home">
            <BrandMark />
          </Link>
          <MobileSignOut />
        </header>
        <main id="main" className="flex-1 px-5 pt-8 pb-28 sm:px-8 md:px-10 md:py-10">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <TabBar />
      </nav>
    </div>
  );
}
