import type { Platform, SocialAccountStatus } from "@snip/db";
import { PlatformIcon } from "@/components/platform-icon";
import { PLATFORMS } from "@/lib/platforms";

export type ConnectedAccount = {
  id: string;
  platform: Platform;
  handle: string | null;
  status: SocialAccountStatus;
};

export function AccountsView({ accounts }: { accounts: ConnectedAccount[] }) {
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {PLATFORMS.map((p) => {
          const connected = accounts.find((a) => a.platform === p.id && a.status === "active");
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft"
            >
              <PlatformIcon platform={p.id} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{p.label}</p>
                <p className="text-sm text-muted">
                  {connected
                    ? `Connected as ${connected.handle ?? "your account"}`
                    : `Posts ${p.posts.toLowerCase()} · ${p.needs}`}
                </p>
              </div>
              {connected ? (
                <span className="rounded-full bg-lime px-3 py-1 text-xs font-medium text-ink">
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-muted">
                  Coming soon
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        Connecting uses each platform&apos;s official login. Snip stores the access it is given
        encrypted, never sees your password, and you can disconnect at any time.
      </p>
    </div>
  );
}
