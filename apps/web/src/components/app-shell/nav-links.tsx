"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Link2, Palette } from "lucide-react";
import { cn } from "@/components/ui/cn";

export const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home, soon: false },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, soon: true },
  { href: "/insights", label: "Insights", icon: BarChart3, soon: true },
  { href: "/brand", label: "Brand kit", icon: Palette, soon: false },
  { href: "/accounts", label: "Accounts", icon: Link2, soon: false },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar links (on the ink sidebar). */
export function SidebarNav() {
  const isActive = useActive();
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon, soon }) => {
        const active = isActive(href);
        if (soon) {
          return (
            <li key={href}>
              <span className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted-on-ink/70">
                <Icon aria-hidden className="size-4" />
                {label}
                <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] tracking-wide uppercase">
                  Soon
                </span>
              </span>
            </li>
          );
        }
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
                active
                  ? "bg-white/10 text-paper"
                  : "text-muted-on-ink hover:bg-white/5 hover:text-paper",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-lime"
                />
              )}
              <Icon aria-hidden className={cn("size-4", active && "text-teal-300")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Mobile bottom tab bar: only the live destinations. */
export function TabBar() {
  const isActive = useActive();
  return (
    <ul className="grid grid-cols-3">
      {NAV_ITEMS.filter((i) => !i.soon).map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-ink" : "text-muted",
              )}
            >
              <Icon aria-hidden className={cn("size-5", active && "text-teal-700")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
