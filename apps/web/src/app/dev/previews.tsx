"use client";

import { BrandKitForm } from "@/components/brand/brand-kit-form";
import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";
import { CarouselStudio } from "@/components/studio/carousel-studio";

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

export function StudioPreview() {
  return (
    <CarouselStudio
      postId="00000000-0000-4000-8000-000000000009"
      conversationId={null}
      chatEndpoint="/api/dev/chat"
      brand={{
        businessName: "Chai Point",
        handle: "@chaipoint.pune",
        primary: "#0F9D8F",
        secondary: "#FAF8F5",
        accent: "#C6F432",
        headingFont: null,
        bodyFont: null,
        logoUrl: null,
      }}
      initialSlides={[
        {
          template: "bold-statement",
          theme: "primary",
          headline: "The monsoon menu is here",
          body: "Rainy evenings just got cosier on FC Road.",
          slots: { kicker: "New this week" },
        },
        {
          template: "numbered-tips",
          theme: "secondary",
          headline: "Masala chai + vada pav",
          body: "Hot, crisp and ₹79 till 7pm.",
          slots: { kicker: "Combo" },
        },
        {
          template: "quote-card",
          theme: "dark",
          headline: "",
          body: "",
          slots: {
            quote: "Best cutting chai in Pune, hands down.",
            attribution: "Riya, regular since 2021",
          },
        },
        {
          template: "product-spotlight",
          theme: "secondary",
          headline: "Ginger lemon honey",
          body: "For the sniffles season.",
          slots: { price: "₹60" },
        },
        {
          template: "offer-cta",
          theme: "primary",
          headline: "Come in from the rain",
          body: "Open till 11pm, every day.",
          slots: { offer: "20% off combos", cta: "Visit FC Road" },
        },
      ]}
      initialCaption={
        "Rain outside, chai inside ☕\nOur monsoon menu is finally here. Come in from the rain this week."
      }
      initialHashtags={["#punecafe", "#monsoonvibes", "#chailovers", "#fcroad", "#punefoodie"]}
      initialRender={{
        job: { status: "pending", error: null, createdAt: "2026-11-12T00:00:00.000Z" },
        rendered: 0,
        total: 5,
        images: {},
        postStatus: "draft",
      }}
      actions={{
        saveSlides: async () => ({ ok: true }),
        saveCaption: async () => ({ ok: true }),
        render: async () => ({ ok: true }),
        approve: async () => ({ ok: true }),
        getRenderState: async () => ({
          job: { status: "pending", error: null, createdAt: "2026-11-12T00:00:00.000Z" },
          rendered: 0,
          total: 5,
          images: {},
          postStatus: "draft",
        }),
      }}
    />
  );
}
