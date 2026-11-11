"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PlatformIcon } from "@/components/platform-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { Field, Input, Textarea, describedBy } from "@/components/ui/field";
import { PLATFORMS } from "@/lib/platforms";
import {
  AUDIENCE_SUGGESTIONS,
  BusinessProfile,
  CATEGORIES,
  GOALS,
  STEP_FIELDS,
  TONES,
} from "@/lib/validation/business";
import type { FieldErrors, SaveProfileResult } from "./actions";

type Values = {
  name: string;
  category: string;
  city: string;
  targetAudience: string;
  goals: string[];
  tone: string;
};

const EMPTY: Values = { name: "", category: "", city: "", targetAudience: "", goals: [], tone: "" };
const TOTAL_STEPS = 5;

type Props = {
  firstName: string | null;
  initial: Values | null;
  saveProfile: (input: Values) => Promise<SaveProfileResult>;
  finishAction: () => Promise<void>;
};

export function OnboardingWizard({ firstName, initial, saveProfile, finishAction }: Props) {
  const startsComplete = initial ? BusinessProfile.safeParse(initial).success : false;
  const [step, setStep] = useState(startsComplete ? 4 : 0);
  const [values, setValues] = useState<Values>(initial ?? EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validateStep(index: number): boolean {
    const fields = STEP_FIELDS[index];
    if (!fields) return true;
    const mask = Object.fromEntries(fields.map((f) => [f, true])) as Partial<
      Record<keyof BusinessProfile, true>
    >;
    const result = BusinessProfile.pick(mask).safeParse(values);
    if (result.success) return true;
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof BusinessProfile;
      next[key] ??= issue.message;
    }
    setErrors(next);
    return false;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validateStep(step)) return;

    if (step === 3) {
      startTransition(async () => {
        const result = await saveProfile(values);
        if (result.ok) {
          setStep(4);
        } else {
          setErrors(result.fieldErrors ?? {});
          setFormError(result.error);
        }
      });
      return;
    }
    if (step === 4) {
      startTransition(async () => {
        try {
          await finishAction();
        } catch {
          setFormError("We couldn't finish setup. Please try again.");
        }
      });
      return;
    }
    setStep((s) => s + 1);
  }

  const hello = firstName ? `Hi ${firstName.split(" ")[0]}. ` : "";

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-6 py-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <BrandMark />
        <p className="text-sm text-muted" aria-live="polite">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
      </header>
      <div
        className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step + 1}
      >
        <div
          className="h-full rounded-full bg-lime transition-[width] duration-700 ease-out-expo"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col pt-12 sm:pt-16">
        <div key={step} className="snip-rise flex-1">
          {step === 0 && (
            <StepShell
              headingRef={headingRef}
              title="What's your business called?"
              lead={`${hello}Tell us the basics and Snip will write and design like it knows you.`}
            >
              <Field id="name" label="Business name" error={errors.name}>
                <Input
                  id="name"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Chai Point"
                  autoComplete="organization"
                  className="h-12 text-lg"
                  aria-invalid={Boolean(errors.name) || undefined}
                  aria-describedby={describedBy("name", errors.name)}
                  autoFocus
                />
              </Field>
              <CategoryPicker
                value={values.category}
                onChange={(v) => set("category", v)}
                error={errors.category}
              />
              <Field id="city" label="City" optional hint="Helps with local hashtags and timing">
                <Input
                  id="city"
                  value={values.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Pune"
                  autoComplete="address-level2"
                  aria-describedby="city-hint"
                />
              </Field>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              headingRef={headingRef}
              title="Who do you want to reach?"
              lead="Describe your ideal customer in a sentence. Be specific: age, where they are, what they care about."
            >
              <Field id="audience" label="Your audience" error={errors.targetAudience}>
                <Textarea
                  id="audience"
                  value={values.targetAudience}
                  onChange={(e) => set("targetAudience", e.target.value)}
                  placeholder="College students and young professionals around FC Road who want a cosy place to work or hang out"
                  rows={4}
                  aria-invalid={Boolean(errors.targetAudience) || undefined}
                  aria-describedby={describedBy("audience", errors.targetAudience)}
                  autoFocus
                />
              </Field>
              <div>
                <p className="mb-2 text-sm text-muted">Start from a suggestion</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_SUGGESTIONS.map((s) => (
                    <Chip
                      key={s}
                      selected={values.targetAudience.includes(s)}
                      onClick={() =>
                        set(
                          "targetAudience",
                          values.targetAudience.includes(s)
                            ? values.targetAudience.replace(s, "").replace(/^[,\s]+|[,\s]+$/g, "")
                            : [values.targetAudience.trim(), s].filter(Boolean).join(", "),
                        )
                      }
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              headingRef={headingRef}
              title="What should social media do for you?"
              lead="Pick up to five. Snip plans posts around these."
            >
              <GoalPicker
                value={values.goals}
                onChange={(v) => set("goals", v)}
                error={errors.goals}
              />
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              headingRef={headingRef}
              title="How should Snip sound?"
              lead="Pick the voice for captions and slides. You can fine-tune it later in your brand kit."
            >
              <TonePicker
                value={values.tone}
                onChange={(v) => set("tone", v)}
                error={errors.tone}
                businessName={values.name || "your business"}
              />
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              headingRef={headingRef}
              title="Connect where you post"
              lead="Snip needs permission to post for you. You approve every post first."
            >
              <ul className="space-y-3">
                {PLATFORMS.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft"
                  >
                    <PlatformIcon platform={p.id} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{p.label}</p>
                      <p className="text-sm text-muted">{p.needs}</p>
                    </div>
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-muted">
                      Coming soon
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">
                Account connections are being switched on next. You can start designing carousels
                right away and connect later from Accounts.
              </p>
            </StepShell>
          )}
        </div>

        {formError && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {formError}
          </p>
        )}

        <div className="sticky bottom-0 mt-10 flex items-center justify-between gap-3 bg-paper/90 py-4 backdrop-blur">
          {step > 0 && step < 4 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
              <ArrowLeft aria-hidden className="size-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
            {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {step === 3 ? "Save and continue" : step === 4 ? "Go to my dashboard" : "Continue"}
            {!pending && <ArrowRight aria-hidden className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepShell({
  title,
  lead,
  headingRef,
  children,
}: {
  title: string;
  lead: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-8">
      <div>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[clamp(2rem,1.4rem+2.4vw,3rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-ink outline-none"
        >
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted">{lead}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function CategoryPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
}) {
  const isPreset = (CATEGORIES as readonly string[]).includes(value);
  const [custom, setCustom] = useState(!isPreset && value !== "");
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-ink">What kind of business?</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            selected={value === c && !custom}
            onClick={() => {
              setCustom(false);
              onChange(c);
            }}
          >
            {c}
          </Chip>
        ))}
        <Chip
          selected={custom}
          onClick={() => {
            setCustom(true);
            if (isPreset) onChange("");
          }}
        >
          Something else
        </Chip>
      </div>
      {custom && (
        <Input
          aria-label="Your business category"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Pet grooming"
          className="mt-2 max-w-xs"
          autoFocus
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function GoalPicker({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string | undefined;
}) {
  const [draft, setDraft] = useState("");
  const presetLabels = GOALS.map((g) => g.label) as string[];
  const customGoals = value.filter((g) => !presetLabels.includes(g));
  const toggle = (label: string) =>
    onChange(value.includes(label) ? value.filter((g) => g !== label) : [...value, label]);
  const addDraft = () => {
    const goal = draft.trim();
    if (goal && !value.includes(goal) && value.length < 5) onChange([...value, goal]);
    setDraft("");
  };

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Goals</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {GOALS.map((g) => {
          const selected = value.includes(g.label);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={selected}
              disabled={!selected && value.length >= 5}
              onClick={() => toggle(g.label)}
              className={cn(
                "rounded-2xl border p-4 text-left font-medium transition-[background-color,border-color,color,transform] duration-200 ease-out-expo active:scale-[0.98] disabled:opacity-40",
                selected
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-white text-ink hover:border-ink/30",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mb-3 block size-2.5 rounded-full",
                  selected ? "bg-lime" : "bg-ink/15",
                )}
              />
              {g.label}
            </button>
          );
        })}
      </div>
      {customGoals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customGoals.map((g) => (
            <Chip key={g} selected onClick={() => toggle(g)}>
              {g}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex max-w-md gap-2">
        <Input
          aria-label="Add your own goal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Add your own goal"
          maxLength={60}
        />
        <Button
          variant="secondary"
          onClick={addDraft}
          disabled={!draft.trim() || value.length >= 5}
        >
          <Plus aria-hidden className="size-4" /> Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function TonePicker({
  value,
  onChange,
  error,
  businessName,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  businessName: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Tone of voice</legend>
      <div className="grid gap-3">
        {TONES.map((t) => {
          const selected = value === t.id;
          return (
            <label
              key={t.id}
              className={cn(
                "flex cursor-pointer gap-4 rounded-2xl border bg-white p-4 transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-500",
                selected
                  ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]"
                  : "border-line hover:border-ink/30",
              )}
            >
              <input
                type="radio"
                name="tone"
                value={t.id}
                checked={selected}
                onChange={() => onChange(t.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2",
                  selected ? "border-ink bg-ink" : "border-line",
                )}
              >
                {selected && <span className="size-2 rounded-full bg-lime" />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{t.label}</span>
                <span className="mt-1 block text-sm text-muted">
                  <span className="font-medium text-ink/80">{businessName}</span> {t.sample}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
