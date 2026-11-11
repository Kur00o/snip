"use server";

import { redirect } from "next/navigation";
import { getMyBusiness, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BusinessProfile, goalsToText } from "@/lib/validation/business";

export type FieldErrors = Partial<Record<keyof BusinessProfile, string>>;
export type SaveProfileResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

/** Create the business on first save, update it afterwards. Never trusts the client's ids. */
export async function saveBusinessProfile(input: unknown): Promise<SaveProfileResult> {
  const user = await requireUser();
  const parsed = BusinessProfile.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BusinessProfile | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Some answers need another look.", fieldErrors };
  }

  const p = parsed.data;
  const row = {
    name: p.name,
    category: p.category,
    city: p.city || null,
    target_audience: p.targetAudience,
    goals: goalsToText(p.goals),
    tone: p.tone,
  };

  const supabase = await createClient();
  const existing = await getMyBusiness();
  const { error } = existing
    ? await supabase.from("businesses").update(row).eq("id", existing.id)
    : await supabase.from("businesses").insert({ ...row, owner_id: user.id });

  if (error) return { ok: false, error: "We couldn't save that. Please try again." };
  return { ok: true };
}

export async function finishOnboarding(): Promise<void> {
  await requireUser();
  const business = await getMyBusiness();
  if (!business) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ onboarding_done: true })
    .eq("id", business.id);
  if (error) throw new Error("Could not finish onboarding. Please try again.");

  redirect("/home");
}
