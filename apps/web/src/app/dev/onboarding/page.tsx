import { notFound } from "next/navigation";
import { OnboardingPreview } from "../previews";

export default function DevOnboarding() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main className="flex-1 bg-paper">
      <OnboardingPreview />
    </main>
  );
}
