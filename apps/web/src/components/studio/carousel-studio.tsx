"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  CAROUSEL_TEMPLATES,
  TEMPLATE_LABELS,
  paletteFor,
  renderSlide,
  type CarouselTemplateId,
  type SlideBrand,
  type SlideTheme,
} from "@snip/templates";
import type { SlideRecord } from "@snip/agent";
import { ChatScreen } from "@/components/chat/chat-screen";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { RenderState, StudioResult } from "@/app/(app)/studio/[postId]/actions";
import { FluidSlideFrame, SlideFrame } from "./slide-frame";

type Actions = {
  saveSlides: (postId: string, slides: SlideRecord[]) => Promise<StudioResult>;
  saveCaption: (
    postId: string,
    input: { caption: string; hashtags: string[] },
  ) => Promise<StudioResult>;
  render: (postId: string) => Promise<StudioResult>;
  approve: (postId: string) => Promise<StudioResult>;
  getRenderState: (postId: string) => Promise<RenderState>;
};

type Props = {
  postId: string;
  conversationId: string | null;
  brand: SlideBrand;
  initialSlides: SlideRecord[];
  initialCaption: string;
  initialHashtags: string[];
  initialRender: RenderState;
  actions: Actions;
  chatEndpoint?: string;
};

const SLOT_FIELDS: Record<CarouselTemplateId, { key: string; label: string; max: number }[]> = {
  "bold-statement": [{ key: "kicker", label: "Small label", max: 24 }],
  "numbered-tips": [
    { key: "kicker", label: "Small label", max: 24 },
    { key: "number", label: "Big number", max: 4 },
  ],
  "quote-card": [
    { key: "quote", label: "Quote", max: 160 },
    { key: "attribution", label: "Who said it", max: 40 },
  ],
  "product-spotlight": [
    { key: "kicker", label: "Small label", max: 24 },
    { key: "price", label: "Price", max: 16 },
  ],
  "offer-cta": [
    { key: "kicker", label: "Small label", max: 24 },
    { key: "offer", label: "Offer", max: 30 },
    { key: "cta", label: "Button text", max: 30 },
    { key: "handle", label: "Handle or address", max: 30 },
  ],
};

const THEME_LABELS: Record<SlideTheme, string> = {
  primary: "Main",
  secondary: "Light",
  dark: "Dark",
};
type Tab = "slide" | "caption" | "chat";

export function CarouselStudio(props: Props) {
  const { postId, brand, actions } = props;
  const router = useRouter();
  const [slides, setSlides] = useState(props.initialSlides);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<Tab>("slide");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [renderState, setRenderState] = useState(props.initialRender);
  const [busy, startTransition] = useTransition();
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the agent edits slides (chat panel → router.refresh), take the server's version.
  const serverKey = JSON.stringify(props.initialSlides);
  useEffect(() => {
    if (!dirtyRef.current) setSlides(JSON.parse(serverKey) as SlideRecord[]);
  }, [serverKey]);

  const html = useMemo(
    () => slides.map((slide, index) => renderSlide({ slide, brand, index, total: slides.length })),
    [slides, brand],
  );
  const current = slides[Math.min(selected, slides.length - 1)];

  const queueSave = useCallback(
    (next: SlideRecord[]) => {
      dirtyRef.current = true;
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const result = await actions.saveSlides(postId, next);
        dirtyRef.current = false;
        setSaveState(result.ok ? "saved" : "error");
        if (result.ok) setRenderState((s) => ({ ...s, rendered: 0, images: {} }));
      }, 700);
    },
    [actions, postId],
  );

  const update = (next: SlideRecord[]) => {
    setSlides(next);
    queueSave(next);
  };
  const patchSlide = (change: Partial<SlideRecord>) =>
    update(slides.map((s, i) => (i === selected ? { ...s, ...change } : s)));
  const patchSlot = (key: string, value: string) => {
    if (!current) return;
    const slots = { ...current.slots };
    if (value) slots[key] = value;
    else delete slots[key];
    patchSlide({ slots });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    update(next);
    setSelected(to);
  };
  const duplicate = () => {
    if (!current || slides.length >= 10) return;
    const next = [...slides];
    next.splice(selected + 1, 0, structuredClone(current));
    update(next);
    setSelected(selected + 1);
  };
  const remove = () => {
    if (slides.length <= 1) return;
    update(slides.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1));
  };
  const add = () => {
    if (slides.length >= 10) return;
    const next = [...slides];
    next.splice(selected + 1, 0, {
      template: "numbered-tips",
      theme: "secondary",
      headline: "New slide",
      body: "",
      slots: {},
    });
    update(next);
    setSelected(selected + 1);
  };

  // Poll while a render is queued or running.
  const jobActive = renderState.job?.status === "pending" || renderState.job?.status === "running";
  useEffect(() => {
    if (!jobActive) return;
    const t = setInterval(async () => {
      try {
        setRenderState(await actions.getRenderState(postId));
      } catch {
        // keep polling; a network blip shouldn't break the studio
      }
    }, 3000);
    return () => clearInterval(t);
  }, [jobActive, actions, postId]);

  const startRender = () =>
    startTransition(async () => {
      const r = await actions.render(postId);
      if (r.ok) setRenderState(await actions.getRenderState(postId));
    });
  const approve = () =>
    startTransition(async () => {
      const r = await actions.approve(postId);
      if (r.ok) setRenderState(await actions.getRenderState(postId));
    });

  const allRendered = renderState.rendered === slides.length && renderState.total === slides.length;
  const selectedImage = allRendered ? renderState.images[selected] : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={props.conversationId ? `/chat/${props.conversationId}` : "/posts"}
          className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label="Back"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-ink">
            {slides[0]?.headline || "Untitled carousel"}
          </h1>
          <p className="text-sm text-muted">
            Carousel · {slides.length} slide{slides.length === 1 ? "" : "s"} ·{" "}
            <StatusText status={renderState.postStatus} /> ·{" "}
            <span role="status">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "error"
                  ? "Couldn't save"
                  : "Saved"}
            </span>
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={startRender}
            disabled={busy || jobActive}
          >
            {jobActive ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <ImageIcon aria-hidden className="size-4" />
            )}
            {allRendered ? "Re-render" : "Render PNGs"}
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={approve}
            disabled={busy || renderState.postStatus === "approved"}
          >
            <Check aria-hidden className="size-4" />
            {renderState.postStatus === "approved" ? "Approved" : "Approve"}
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section aria-label="Slides" className="min-w-0">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected((s) => Math.max(0, s - 1))}
              disabled={selected === 0}
              aria-label="Previous slide"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </Button>
            <div className="w-full max-w-[26rem] overflow-hidden rounded-2xl shadow-soft ring-1 ring-ink/10">
              {selectedImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
                <img
                  src={selectedImage}
                  alt={`Slide ${selected + 1} as rendered`}
                  className="aspect-[4/5] w-full"
                />
              ) : (
                <FluidSlideFrame
                  html={html[selected] ?? ""}
                  title={`Slide ${selected + 1} preview`}
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected((s) => Math.min(slides.length - 1, s + 1))}
              disabled={selected >= slides.length - 1}
              aria-label="Next slide"
            >
              <ChevronRight aria-hidden className="size-5" />
            </Button>
          </div>

          <RenderStatus state={renderState} slideCount={slides.length} />

          <ol className="mt-6 flex gap-3 overflow-x-auto pb-2" aria-label="All slides">
            {html.map((h, i) => (
              <li key={i} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-current={i === selected ? "true" : undefined}
                  aria-label={`Slide ${i + 1}: ${slides[i]?.headline}`}
                  className={cn(
                    "block overflow-hidden rounded-lg ring-2 transition-[box-shadow,transform] duration-200",
                    i === selected ? "ring-teal-500" : "ring-transparent hover:ring-ink/20",
                  )}
                >
                  <SlideFrame html={h} width={88} title={`Slide ${i + 1}`} />
                </button>
                <p className="mt-1 text-center text-xs text-muted">{i + 1}</p>
              </li>
            ))}
            {slides.length < 10 && (
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={add}
                  className="grid h-[110px] w-[88px] place-items-center rounded-lg border-2 border-dashed border-line text-muted transition-colors hover:border-ink/30 hover:text-ink"
                  aria-label="Add a slide after this one"
                >
                  <Plus aria-hidden className="size-5" />
                </button>
              </li>
            )}
          </ol>
        </section>

        <aside
          className="min-w-0 rounded-2xl border border-line bg-white shadow-soft"
          aria-label="Editor"
        >
          <div
            role="tablist"
            aria-label="Editor"
            className="grid grid-cols-3 border-b border-line p-1.5"
          >
            {(["slide", "caption", "chat"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                id={`tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                onClick={() => setTab(t)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium capitalize transition-colors",
                  tab === t ? "bg-ink text-paper" : "text-muted hover:text-ink",
                )}
              >
                {t === "chat" ? "Ask Snip" : t}
              </button>
            ))}
          </div>

          {tab === "slide" && current && (
            <div
              role="tabpanel"
              id="panel-slide"
              aria-labelledby="tab-slide"
              className="space-y-5 p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink">Slide {selected + 1}</p>
                <div className="flex gap-1">
                  <IconButton
                    label="Move left"
                    onClick={() => move(selected, selected - 1)}
                    disabled={selected === 0}
                  >
                    <ArrowLeft className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Move right"
                    onClick={() => move(selected, selected + 1)}
                    disabled={selected === slides.length - 1}
                  >
                    <ArrowRight className="size-4" />
                  </IconButton>
                  <IconButton label="Duplicate" onClick={duplicate} disabled={slides.length >= 10}>
                    <Copy className="size-4" />
                  </IconButton>
                  <IconButton label="Delete slide" onClick={remove} disabled={slides.length <= 1}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>

              <Field id="layout" label="Layout">
                <Select
                  id="layout"
                  value={current.template}
                  onChange={(e) => patchSlide({ template: e.target.value as CarouselTemplateId })}
                >
                  {CAROUSEL_TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {TEMPLATE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </Field>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">Colours</legend>
                <div className="flex gap-2">
                  {(["primary", "secondary", "dark"] as const).map((theme) => {
                    const p = paletteFor(brand, theme);
                    return (
                      <button
                        key={theme}
                        type="button"
                        aria-pressed={current.theme === theme}
                        onClick={() => patchSlide({ theme })}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-colors",
                          current.theme === theme
                            ? "border-ink text-ink"
                            : "border-line text-muted hover:border-ink/30",
                        )}
                      >
                        <span
                          aria-hidden
                          className="grid h-8 w-full place-items-center rounded-lg text-[0.7rem] font-bold ring-1 ring-ink/10"
                          style={{ background: p.bg, color: p.fg }}
                        >
                          Aa
                        </span>
                        {THEME_LABELS[theme]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {current.template !== "quote-card" && (
                <>
                  <Field id="headline" label="Headline" hint={`${current.headline.length}/70`}>
                    <Textarea
                      id="headline"
                      rows={2}
                      maxLength={70}
                      value={current.headline}
                      onChange={(e) => patchSlide({ headline: e.target.value })}
                      className="min-h-0"
                    />
                  </Field>
                  <Field id="body" label="Text" hint={`${current.body.length}/180`}>
                    <Textarea
                      id="body"
                      rows={3}
                      maxLength={180}
                      value={current.body}
                      onChange={(e) => patchSlide({ body: e.target.value })}
                      className="min-h-0"
                    />
                  </Field>
                </>
              )}

              {SLOT_FIELDS[current.template].map((f) => (
                <Field key={f.key} id={`slot-${f.key}`} label={f.label} optional>
                  {f.max > 60 ? (
                    <Textarea
                      id={`slot-${f.key}`}
                      rows={3}
                      maxLength={f.max}
                      value={current.slots[f.key] ?? ""}
                      onChange={(e) => patchSlot(f.key, e.target.value)}
                      className="min-h-0"
                    />
                  ) : (
                    <Input
                      id={`slot-${f.key}`}
                      maxLength={f.max}
                      value={current.slots[f.key] ?? ""}
                      onChange={(e) => patchSlot(f.key, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
          )}

          {tab === "caption" && (
            <div role="tabpanel" id="panel-caption" aria-labelledby="tab-caption" className="p-5">
              <CaptionEditor
                postId={postId}
                initialCaption={props.initialCaption}
                initialHashtags={props.initialHashtags}
                save={actions.saveCaption}
              />
            </div>
          )}

          {tab === "chat" && (
            <div
              role="tabpanel"
              id="panel-chat"
              aria-labelledby="tab-chat"
              className="flex h-[32rem] flex-col p-3"
            >
              <p className="px-2 pb-2 text-sm text-muted">
                Try: &ldquo;make slide 2 shorter&rdquo;, &ldquo;use the quote layout on slide
                3&rdquo;
              </p>
              <div className="min-h-0 flex-1">
                <ChatScreen
                  variant="panel"
                  syncUrl={false}
                  endpoint={props.chatEndpoint}
                  conversationId={props.conversationId}
                  extraBody={{ postId }}
                  placeholder="Ask for a change…"
                  onTurnDone={() => {
                    dirtyRef.current = false;
                    router.refresh();
                    void actions
                      .getRenderState(postId)
                      .then(setRenderState)
                      .catch(() => undefined);
                  }}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function RenderStatus({ state, slideCount }: { state: RenderState; slideCount: number }) {
  const job = state.job;
  const waitingLong = useWaitingLong(job?.status === "pending" ? job.createdAt : null);
  let text: React.ReactNode = "Preview. Render PNGs when you're happy with it.";
  if (job?.status === "pending") {
    text = waitingLong
      ? "Queued. Waiting for the render worker; start it on your laptop (see the setup guide)."
      : "Queued for rendering…";
  } else if (job?.status === "running") {
    text = `Rendering… ${state.rendered}/${slideCount}`;
  } else if (job?.status === "failed") {
    text = `Rendering failed: ${job.error ?? "unknown error"}. Try again.`;
  } else if (state.rendered === slideCount && slideCount > 0 && state.total === slideCount) {
    text = (
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1 text-teal-700">
          <Check aria-hidden className="size-4" /> PNGs ready (1080×1350)
        </span>
        {Object.entries(state.images).map(([pos, url]) => (
          <a
            key={pos}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            <Download aria-hidden className="size-3.5" /> {Number(pos) + 1}
          </a>
        ))}
      </span>
    );
  }
  return (
    <p role="status" className="mt-4 text-center text-sm text-muted">
      {text}
    </p>
  );
}

/** True once a queued job has waited 45 s (the worker is probably not running). */
function useWaitingLong(queuedAt: string | null) {
  const [lateFor, setLateFor] = useState<string | null>(null);
  useEffect(() => {
    if (!queuedAt) return;
    const remaining = Math.max(0, 45_000 - (Date.now() - new Date(queuedAt).getTime()));
    const t = setTimeout(() => setLateFor(queuedAt), remaining);
    return () => clearTimeout(t);
  }, [queuedAt]);
  return queuedAt !== null && lateFor === queuedAt;
}

function CaptionEditor({
  postId,
  initialCaption,
  initialHashtags,
  save,
}: {
  postId: string;
  initialCaption: string;
  initialHashtags: string[];
  save: Actions["saveCaption"];
}) {
  const [caption, setCaption] = useState(initialCaption);
  const [tags, setTags] = useState(initialHashtags.join(" "));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const full = [caption.trim(), tags.trim()].filter(Boolean).join("\n\n");

  async function onSave() {
    setState("saving");
    const r = await save(postId, { caption, hashtags: tags.split(/[\s,]+/).filter(Boolean) });
    setState(r.ok ? "saved" : "error");
  }

  return (
    <div className="space-y-4">
      <Field id="caption" label="Caption" hint={`${caption.length}/2200`}>
        <Textarea
          id="caption"
          rows={8}
          maxLength={2200}
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            setState("idle");
          }}
        />
      </Field>
      <Field id="hashtags" label="Hashtags" hint="Separate with spaces">
        <Textarea
          id="hashtags"
          rows={3}
          value={tags}
          onChange={(e) => {
            setTags(e.target.value);
            setState("idle");
          }}
          className="min-h-0 text-teal-700"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onSave} disabled={state === "saving"}>
          {state === "saving" && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Save caption
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(full);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          disabled={!full}
        >
          <Copy aria-hidden className="size-4" /> {copied ? "Copied" : "Copy"}
        </Button>
        <span role="status" className="text-sm text-muted">
          {state === "saved" ? "Saved" : state === "error" ? "Couldn't save" : ""}
        </span>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-30"
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

function StatusText({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Draft",
    review: "Ready to review",
    approved: "Approved",
    scheduled: "Scheduled",
    published: "Published",
    failed: "Failed",
  };
  return <>{labels[status] ?? status}</>;
}
