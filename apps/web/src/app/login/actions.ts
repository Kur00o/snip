"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { siteOrigin } from "@/lib/origin";
import { safeNextPath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
  fields?: { email?: string; name?: string };
};

const SignIn = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const SignUp = z.object({
  name: z.string().trim().min(1, "What should we call you?").max(80),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(72, "Use at most 72 characters"),
});

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Confirm your email first. Check your inbox.";
  if (m.includes("already registered")) return "You already have an account. Sign in instead.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Wait a minute and try again.";
  if (m.includes("signups not allowed")) return "Sign-ups are closed right now.";
  return "Something went wrong. Please try again.";
}

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const parsed = SignIn.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: friendly(error.message), fields: { email } };

  redirect(safeNextPath(formData.get("next") as string | null));
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");
  const parsed = SignUp.safeParse({ name, email, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields: { email, name } };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      data: { full_name: parsed.data.name },
    },
  });
  if (error) return { error: friendly(error.message), fields: { email, name } };

  // With "Confirm email" off, Supabase signs the user in straight away.
  if (data.session) redirect("/onboarding");

  return {
    message: `We sent a confirmation link to ${parsed.data.email}. Open it to finish signing up.`,
    fields: { email, name },
  };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNextPath(formData.get("next") as string | null);
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
