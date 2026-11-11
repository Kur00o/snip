"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Field, Input, describedBy } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/components/ui/cn";
import { signInWithEmail, signInWithGoogle, signUpWithEmail, type AuthFormState } from "./actions";

const URL_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't finish. Please try again.",
  link: "That link has expired or was already used. Sign in or request a new one.",
};

type Mode = "signin" | "signup";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";
  const urlError = URL_ERRORS[params.get("error") ?? ""];
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-ink">
        {mode === "signin" ? "Welcome back" : "Start for free"}
      </h1>
      <p className="mt-2 text-muted">
        {mode === "signin"
          ? "Sign in to plan, design and post."
          : "Set up your brand in two minutes. No card needed."}
      </p>

      <div
        role="group"
        aria-label="Sign in or create an account"
        className="mt-8 grid grid-cols-2 rounded-xl bg-ink/5 p-1"
      >
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "h-9 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200",
              mode === m ? "bg-white text-ink shadow-soft" : "text-muted hover:text-ink",
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {urlError && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {urlError}
        </p>
      )}

      <form action={signInWithGoogle} className="mt-6">
        <input type="hidden" name="next" value={next} />
        <SubmitButton
          variant="secondary"
          size="lg"
          className="w-full"
          pendingLabel="Opening Google…"
        >
          Continue with Google
        </SubmitButton>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs tracking-wide text-muted uppercase">
        <span className="h-px flex-1 bg-line" />
        or with email
        <span className="h-px flex-1 bg-line" />
      </div>

      {mode === "signin" ? <SignInForm next={next} /> : <SignUpForm />}
    </div>
  );
}

function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(signInWithEmail, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id="email" label="Email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.fields?.email}
          aria-invalid={Boolean(state.error) || undefined}
          aria-describedby={describedBy("email", state.error)}
        />
      </Field>
      <Field id="password" label="Password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      {state.error && (
        <p id="email-error" role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
        Sign in <ArrowRight aria-hidden className="size-4" />
      </SubmitButton>
    </form>
  );
}

function SignUpForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signUpWithEmail, {});

  if (state.message) {
    return (
      <div role="status" className="rounded-2xl border border-line bg-white p-5 text-sm text-ink">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="name" label="Your name">
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state.fields?.name}
        />
      </Field>
      <Field id="signup-email" label="Email">
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.fields?.email}
        />
      </Field>
      <Field id="signup-password" label="Password" hint="At least 8 characters">
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby="signup-password-hint"
        />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg" className="w-full" pendingLabel="Creating your account…">
        Create account <ArrowRight aria-hidden className="size-4" />
      </SubmitButton>
    </form>
  );
}
