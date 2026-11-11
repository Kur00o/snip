import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getMyBusiness, getSessionUser } from "@/lib/auth";

/** Business + user card at the bottom of the sidebar. Reads the session, so it streams in. */
export async function AccountMenu() {
  const [user, business] = await Promise.all([getSessionUser(), getMyBusiness()]);
  const initial = (business?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-500 font-semibold text-ink"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-paper">{business?.name ?? "Your brand"}</p>
        <p className="truncate text-xs text-muted-on-ink">{user?.email}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="grid size-9 place-items-center rounded-xl text-muted-on-ink transition-colors hover:bg-white/10 hover:text-paper"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function AccountMenuSkeleton() {
  return <div className="h-[3.75rem] rounded-2xl bg-white/5 ring-1 ring-white/10" aria-hidden />;
}

/** Compact sign-out for the mobile top bar. */
export function MobileSignOut() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        aria-label="Sign out"
      >
        <LogOut aria-hidden className="size-4" />
      </button>
    </form>
  );
}
