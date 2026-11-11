import { ChatScreen } from "@/components/chat/chat-screen";
import type { ChecklistItem } from "@/lib/checklist";
import { starterTemplates } from "@/lib/starters";
import { SetupChecklist } from "./setup-checklist";

type Props = {
  businessName: string;
  firstName: string | null;
  checklist: ChecklistItem[];
  /** Override the chat endpoint (dev previews use a mock). */
  endpoint?: string;
};

export function HomeView({ businessName, firstName, checklist, endpoint }: Props) {
  return (
    <ChatScreen
      endpoint={endpoint}
      syncUrl={!endpoint}
      empty={{
        eyebrow: `${firstName ? `Hi ${firstName.split(" ")[0]} · ` : ""}${businessName}`,
        title: "What are we making today?",
        starters: starterTemplates(businessName),
        aside: <SetupChecklist items={checklist} />,
      }}
    />
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
