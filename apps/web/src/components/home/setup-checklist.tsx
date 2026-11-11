import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { checklistProgress, type ChecklistItem } from "@/lib/checklist";

export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  const progress = checklistProgress(items);

  if (done === items.length) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-line bg-white p-4 text-sm text-ink">
        <span className="grid size-6 place-items-center rounded-full bg-lime">
          <Check aria-hidden className="size-3.5 text-ink" strokeWidth={3} />
        </span>
        Your brand is set up. Snip will design everything to match.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="setup-heading"
      className="rounded-2xl border border-line bg-white p-5 shadow-soft"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="setup-heading" className="font-semibold tracking-[-0.02em] text-ink">
          Finish setting up
        </h2>
        <span className="text-sm text-muted">
          {done} of {items.length}
        </span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${progress * 100}%` }} />
      </div>
      <ul className="-mx-2 mt-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-paper"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full",
                  item.done ? "bg-lime" : "border-2 border-line",
                )}
              >
                {item.done && <Check className="size-3.5 text-ink" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    item.done ? "text-muted line-through decoration-ink/30" : "text-ink",
                  )}
                >
                  {item.label}
                  <span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
                </span>
                {!item.done && <span className="block text-xs text-muted">{item.hint}</span>}
              </span>
              {!item.done && (
                <ArrowRight
                  aria-hidden
                  className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
