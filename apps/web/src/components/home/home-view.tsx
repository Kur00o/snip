import type { ChecklistItem } from "@/lib/checklist";
import { starterTemplates } from "@/lib/starters";
import { HomeComposer } from "./home-composer";
import { SetupChecklist } from "./setup-checklist";

type Props = { businessName: string; firstName: string | null; checklist: ChecklistItem[] };

export function HomeView({ businessName, firstName, checklist }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <p className="text-sm font-medium text-teal-700">
            {firstName ? `Hi ${firstName.split(" ")[0]} · ` : ""}
            {businessName}
          </p>
          <h1 className="mt-2 mb-8 text-[clamp(2rem,1.3rem+2.6vw,3.25rem)] leading-[1] font-semibold tracking-[-0.045em] text-ink">
            What are we making today?
          </h1>
          <HomeComposer starters={starterTemplates(businessName)} />
        </div>
        <aside className="lg:pt-[6.5rem]" aria-label="Setup">
          <SetupChecklist items={checklist} />
        </aside>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-40 rounded bg-ink/10" />
      <div className="mt-4 h-12 w-3/4 rounded-xl bg-ink/10" />
      <div className="mt-8 h-40 rounded-[1.25rem] bg-ink/5" />
    </div>
  );
}
