"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { Check, ImageUp, Loader2, X } from "lucide-react";
import { BUCKETS } from "@snip/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { BRAND_FONTS, googleFontsHref } from "@/lib/fonts";
import { createClient } from "@/lib/supabase/client";
import {
  LOGO_TYPES,
  MAX_LOGO_BYTES,
  contrastRatio,
  parseWordList,
  readableTextOn,
} from "@/lib/validation/brand-kit";
import type { ActionResult, UploadTicket } from "@/app/(app)/brand/actions";

export type BrandKitFormValues = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  voice: string;
  bannedWords: string;
};

/** What the form sends; the server action validates it with BrandKitInput. */
export type BrandKitPayload = Omit<BrandKitFormValues, "bannedWords"> & { bannedWords: string[] };

type Props = {
  businessName: string;
  initial: BrandKitFormValues;
  logoUrl: string | null;
  save: (input: BrandKitPayload) => Promise<ActionResult>;
  createUpload: (input: { contentType: string; size: number }) => Promise<UploadTicket>;
  saveLogo: (input: { path: string; contentType: string; size: number }) => Promise<ActionResult>;
};

export function BrandKitForm({
  businessName,
  initial,
  logoUrl,
  save,
  createUpload,
  saveLogo,
}: Props) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const set = (key: keyof BrandKitFormValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus(null);
  };

  function onSave() {
    startTransition(async () => {
      const result = await save({
        primaryColor: values.primaryColor,
        secondaryColor: values.secondaryColor,
        accentColor: values.accentColor,
        headingFont: values.headingFont,
        bodyFont: values.bodyFont,
        voice: values.voice,
        bannedWords: parseWordList(values.bannedWords),
      });
      if (result.ok) {
        setSaved(values);
        setStatus({ kind: "ok", text: "Saved. New posts will use this brand kit." });
      } else {
        setStatus({ kind: "error", text: result.error });
      }
    });
  }

  const fontsHref = googleFontsHref([values.headingFont, values.bodyFont]);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {fontsHref && <link rel="stylesheet" href={fontsHref} precedence="default" />}

      <form
        className="min-w-0 space-y-12"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <Section
          id="colours"
          title="Colours"
          lead="Your main colour fills slides; the others are for highlights and backgrounds."
        >
          <ColourRow
            id="primary"
            label="Main colour"
            value={values.primaryColor}
            onChange={(v) => set("primaryColor", v)}
          />
          <ColourRow
            id="secondary"
            label="Second colour"
            optional
            value={values.secondaryColor}
            onChange={(v) => set("secondaryColor", v)}
          />
          <ColourRow
            id="accent"
            label="Accent"
            optional
            value={values.accentColor}
            onChange={(v) => set("accentColor", v)}
          />
        </Section>

        <Section
          id="fonts"
          title="Fonts"
          lead="All free Google Fonts. Ones marked हि also cover Hindi and Marathi."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FontSelect
              id="heading-font"
              label="Headlines"
              value={values.headingFont}
              onChange={(v) => set("headingFont", v)}
            />
            <FontSelect
              id="body-font"
              label="Body text"
              value={values.bodyFont}
              onChange={(v) => set("bodyFont", v)}
            />
          </div>
        </Section>

        <Section
          id="logo"
          title="Logo"
          lead="PNG with a transparent background works best. Up to 10 MB."
        >
          <LogoUploader initialUrl={logoUrl} createUpload={createUpload} saveLogo={saveLogo} />
        </Section>

        <Section
          id="voice"
          title="Voice"
          lead="How you talk to customers. Snip follows this in every caption."
        >
          <Field
            id="voice-notes"
            label="Describe your voice"
            optional
            hint="e.g. Warm, a little cheeky, mixes in Hinglish, never pushy"
          >
            <Textarea
              id="voice-notes"
              value={values.voice}
              onChange={(e) => set("voice", e.target.value)}
              maxLength={500}
              rows={3}
              aria-describedby="voice-notes-hint"
            />
          </Field>
          <Field
            id="banned"
            label="Words to avoid"
            optional
            hint="Comma separated, e.g. cheap, discount, best ever"
          >
            <Input
              id="banned"
              value={values.bannedWords}
              onChange={(e) => set("bannedWords", e.target.value)}
              aria-describedby="banned-hint"
            />
          </Field>
        </Section>

        <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white/95 p-3 shadow-soft backdrop-blur md:bottom-4">
          <Button type="submit" disabled={!dirty || pending} aria-busy={pending}>
            {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Save brand kit
          </Button>
          <p
            role="status"
            className={cn("text-sm", status?.kind === "error" ? "text-red-700" : "text-muted")}
          >
            {status?.text ?? (dirty ? "You have unsaved changes." : "All changes saved.")}
          </p>
        </div>
      </form>

      <aside aria-label="Preview" className="xl:sticky xl:top-10 xl:self-start">
        <SlidePreview businessName={businessName} values={values} logoUrl={logoUrl} />
      </aside>
    </div>
  );
}

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-10 space-y-5">
      <div>
        <h2 id={`${id}-title`} className="text-xl font-semibold tracking-[-0.025em] text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{lead}</p>
      </div>
      {children}
    </section>
  );
}

function ColourRow({
  id,
  label,
  value,
  onChange,
  optional = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value);
  const onWhite = valid ? contrastRatio(value, "#FFFFFF") : 0;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-ink/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-500"
        style={{
          background: valid
            ? value
            : "repeating-conic-gradient(#E6E2DC 0 25%, #fff 0 50%) 0 0 / 12px 12px",
        }}
      >
        <span className="sr-only">{label} picker</span>
        <input
          type="color"
          value={valid ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <label htmlFor={`${id}-hex`} className="text-sm font-medium text-ink">
          {label}
          {optional && <span className="ml-2 text-xs font-normal text-muted">Optional</span>}
        </label>
        <p className="text-xs text-muted">
          {valid
            ? onWhite >= 4.5
              ? "Readable as text on white"
              : onWhite < 1.5
                ? "Best as a background"
                : "Best for fills and large text"
            : optional
              ? "Not set"
              : "Enter a hex colour"}
        </p>
      </div>
      <div className="w-32 shrink-0">
        <Input
          id={`${id}-hex`}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="#0F9D8F"
          maxLength={7}
          spellCheck={false}
          className="font-mono uppercase"
          aria-invalid={(value !== "" && !valid) || undefined}
        />
      </div>
      {optional && value ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
          aria-label={`Clear ${label}`}
        >
          <X aria-hidden className="size-4" />
        </Button>
      ) : (
        <span aria-hidden className="w-9 shrink-0" />
      )}
    </div>
  );
}

function FontSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field id={id} label={label}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a font</option>
        {BRAND_FONTS.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name} — {f.style}
            {f.devanagari ? " · हि" : ""}
          </option>
        ))}
      </Select>
      <p
        className="truncate text-2xl text-ink"
        style={{ fontFamily: value ? `"${value}", sans-serif` : undefined }}
        aria-hidden
      >
        {value ? "Aa Bb Cc 123" : " "}
      </p>
    </Field>
  );
}

function LogoUploader({
  initialUrl,
  createUpload,
  saveLogo,
}: Pick<Props, "createUpload" | "saveLogo"> & { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [state, setState] = useState<{ busy: boolean; error?: string; done?: boolean }>({
    busy: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = Object.keys(LOGO_TYPES).join(",");

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(file.type in LOGO_TYPES))
      return setState({ busy: false, error: "Upload a PNG, JPG or WebP image." });
    if (file.size > MAX_LOGO_BYTES)
      return setState({ busy: false, error: "Logos must be under 10 MB." });

    setState({ busy: true });
    const meta = { contentType: file.type, size: file.size };
    const ticket = await createUpload(meta);
    if (!ticket.ok) return setState({ busy: false, error: ticket.error });

    const supabase = createClient();
    const { error } = await supabase.storage
      .from(BUCKETS.brandAssets)
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    if (error) return setState({ busy: false, error: "Upload failed. Please try again." });

    const result = await saveLogo({ ...meta, path: ticket.path });
    if (!result.ok) return setState({ busy: false, error: result.error });

    setUrl(URL.createObjectURL(file));
    setState({ busy: false, done: true });
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-line bg-[repeating-conic-gradient(#F1EEE9_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not optimisable
          <img src={url} alt="Your logo" className="max-h-20 max-w-20 object-contain" />
        ) : (
          <ImageUp aria-hidden className="size-6 text-muted" />
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onFile}
          className="sr-only"
          id="logo-file"
        />
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={state.busy}
          aria-busy={state.busy}
        >
          {state.busy ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <ImageUp aria-hidden className="size-4" />
          )}
          {url ? "Replace logo" : "Upload logo"}
        </Button>
        <p role="status" className={cn("text-sm", state.error ? "text-red-700" : "text-muted")}>
          {state.error ??
            (state.done ? (
              <span className="inline-flex items-center gap-1">
                <Check aria-hidden className="size-4 text-teal-700" /> Logo saved
              </span>
            ) : (
              "PNG, JPG or WebP"
            ))}
        </p>
      </div>
    </div>
  );
}

function SlidePreview({
  businessName,
  values,
  logoUrl,
}: {
  businessName: string;
  values: BrandKitFormValues;
  logoUrl: string | null;
}) {
  const hex = (v: string, fallback: string) => (/^#[0-9A-Fa-f]{6}$/.test(v) ? v : fallback);
  const primary = hex(values.primaryColor, "#0F9D8F");
  const secondary = hex(values.secondaryColor, "#FAF8F5");
  const accent = hex(values.accentColor, readableTextOn(primary));
  const onPrimary = readableTextOn(primary);
  const onSecondary = readableTextOn(secondary);
  const kickerColour = contrastRatio(accent, primary) >= 3 ? accent : onPrimary;
  const heading = values.headingFont ? `"${values.headingFont}", sans-serif` : undefined;
  const body = values.bodyFont ? `"${values.bodyFont}", sans-serif` : undefined;
  const initial = businessName.slice(0, 1).toUpperCase();

  const slides = useMemo(
    () => [
      {
        bg: primary,
        fg: onPrimary,
        kicker: "New this week",
        title: "The monsoon menu is here",
        body: "Swipe for four rainy-day combos →",
      },
      {
        bg: secondary,
        fg: onSecondary,
        kicker: "01",
        title: "Masala chai + vada pav",
        body: "Hot, crisp and ₹79 till 7pm.",
      },
    ],
    [primary, onPrimary, secondary, onSecondary],
  );

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted">Live preview</p>
      <div className="grid grid-cols-2 gap-3">
        {slides.map((s, i) => (
          <div
            key={i}
            className="flex aspect-[4/5] min-w-0 flex-col justify-between rounded-2xl p-4 shadow-soft ring-1 ring-ink/5 transition-[background-color,color] duration-500"
            style={{ background: s.bg, color: s.fg }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="truncate text-[0.6rem] font-semibold tracking-wide uppercase"
                style={{ fontFamily: body, color: i === 0 ? kickerColour : undefined }}
              >
                {s.kicker}
              </span>
              {i === 0 &&
                (logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview of signed Storage URL
                  <img src={logoUrl} alt="" className="max-h-6 max-w-12 object-contain" />
                ) : (
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-black/10 text-[0.65rem] font-bold">
                    {initial}
                  </span>
                ))}
            </div>
            <div>
              <p
                className="text-lg leading-[1.02] font-bold tracking-[-0.03em]"
                style={{ fontFamily: heading }}
              >
                {s.title}
              </p>
              <p className="mt-2 text-xs opacity-85" style={{ fontFamily: body }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Text colour switches automatically to stay readable.
      </p>
    </div>
  );
}
