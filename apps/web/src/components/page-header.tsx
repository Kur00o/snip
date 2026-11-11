import type { ReactNode } from "react";

export function PageHeader({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[clamp(1.9rem,1.4rem+1.8vw,2.75rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-ink">
          {title}
        </h1>
        {lead && <p className="mt-2 max-w-xl text-muted">{lead}</p>}
      </div>
      {action}
    </header>
  );
}
