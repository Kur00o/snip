"use client";

import { BrandKitForm } from "@/components/brand/brand-kit-form";
import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Client-side previews with fake actions, for visual QA in development only. */
export function OnboardingPreview() {
  return (
    <OnboardingWizard
      firstName="Asha Kulkarni"
      initial={null}
      saveProfile={async () => {
        await wait(400);
        return { ok: true };
      }}
      finishAction={async () => {
        await wait(400);
      }}
    />
  );
}

export function BrandPreview() {
  return (
    <BrandKitForm
      businessName="Chai Point"
      initial={{
        primaryColor: "#0F9D8F",
        secondaryColor: "#FAF8F5",
        accentColor: "#C6F432",
        headingFont: "Bricolage Grotesque",
        bodyFont: "Inter",
        voice: "Warm and local, a little cheeky, mixes in some Hinglish.",
        bannedWords: "cheap, best ever",
      }}
      logoUrl={null}
      save={async () => {
        await wait(400);
        return { ok: true };
      }}
      createUpload={async () => ({ ok: false, error: "Uploads are disabled in the preview." })}
      saveLogo={async () => ({ ok: true })}
    />
  );
}
