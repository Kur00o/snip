import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getMyBusiness, requireUser, type Business } from "@/lib/auth";
import { TONES, goalsFromText } from "@/lib/validation/business";
import { finishOnboarding, saveBusinessProfile } from "./actions";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = { title: "Set up your brand" };

export default function OnboardingPage() {
  return (
    <main className="flex-1 bg-paper">
      <Suspense fallback={<div className="min-h-svh" aria-busy="true" />}>
        <Wizard />
      </Suspense>
    </main>
  );
}

async function Wizard() {
  const user = await requireUser();
  const business = await getMyBusiness();
  if (business?.onboarding_done) redirect("/home");

  return (
    <OnboardingWizard
      firstName={user.name}
      initial={business ? toValues(business) : null}
      saveProfile={saveBusinessProfile}
      finishAction={finishOnboarding}
    />
  );
}

function toValues(b: Business) {
  const tone = TONES.some((t) => t.id === b.tone) ? (b.tone ?? "") : "";
  return {
    name: b.name,
    category: b.category ?? "",
    city: b.city ?? "",
    targetAudience: b.target_audience ?? "",
    goals: goalsFromText(b.goals),
    tone,
  };
}
