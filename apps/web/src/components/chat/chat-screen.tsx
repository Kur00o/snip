"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { ToolOutcomeData } from "@/lib/sse";
import type { Starter } from "@/lib/starters";
import { PromptBox } from "./prompt-box";
import { RichText } from "./rich-text";
import { ToolCards } from "./tool-cards";
import { useChat, type ChatController, type UiMessage } from "./use-chat";

export type ChatEmptyState = {
  eyebrow: string;
  title: string;
  starters: Starter[];
  /** Server-rendered side content, e.g. the setup checklist. */
  aside?: ReactNode;
};

type Props = {
  conversationId?: string | null;
  initialMessages?: UiMessage[];
  endpoint?: string;
  empty?: ChatEmptyState;
  /** Move the address bar to /chat/<id> once the first reply starts (default on). */
  syncUrl?: boolean;
  /** "panel" fits inside a side panel (the carousel studio). */
  variant?: "page" | "panel";
  extraBody?: Record<string, string>;
  onTurnDone?: (message: UiMessage) => void;
  placeholder?: string;
};

/** Chat-first home and chat thread in one: hero + starters until the first message. */
export function ChatScreen({
  conversationId = null,
  initialMessages = [],
  endpoint,
  empty,
  syncUrl = true,
  variant = "page",
  extraBody,
  onTurnDone,
  placeholder,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chat = useChat({
    endpoint,
    conversationId,
    initialMessages,
    onConversation: syncUrl
      ? (id) => window.history.replaceState(null, "", `/chat/${id}`)
      : undefined,
    extraBody,
    onTurnDone,
  });

  const submit = (text = prompt) => {
    if (!text.trim() || chat.busy) return;
    void chat.send(text);
    setPrompt("");
  };

  if (chat.messages.length === 0 && empty) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-700">{empty.eyebrow}</p>
            <h1 className="mt-2 mb-8 text-[clamp(2rem,1.3rem+2.6vw,3.25rem)] leading-[1] font-semibold tracking-[-0.045em] text-ink">
              {empty.title}
            </h1>
            <PromptBox
              ref={inputRef}
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => submit()}
              busy={chat.busy}
              onStop={chat.stop}
            />
            <Starters
              starters={empty.starters}
              onPick={(s) => {
                setPrompt(s.prompt);
                inputRef.current?.focus();
              }}
            />
          </div>
          {empty.aside && (
            <aside className="lg:pt-[6.5rem]" aria-label="Setup">
              {empty.aside}
            </aside>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        variant === "page"
          ? "mx-auto min-h-[calc(100svh-9rem)] max-w-3xl md:min-h-[calc(100svh-5rem)]"
          : "h-full min-h-0",
      )}
    >
      <div className={cn(variant === "panel" && "min-h-0 flex-1 overflow-y-auto px-1 pt-2")}>
        <Thread chat={chat} onPick={(reply) => submit(reply)} showStudioLink={variant === "page"} />
      </div>
      <div
        className={cn(
          "z-10 bg-gradient-to-t from-paper via-paper to-transparent pt-4",
          variant === "page" ? "sticky bottom-16 mt-6 pb-3 md:bottom-0 md:pb-4" : "pb-1",
        )}
      >
        <PromptBox
          ref={inputRef}
          size="md"
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => submit()}
          busy={chat.busy}
          onStop={chat.stop}
          placeholder={placeholder ?? "Reply to Snip…"}
          autoFocus={variant === "page"}
        />
      </div>
    </div>
  );
}

function Starters({ starters, onPick }: { starters: Starter[]; onPick: (s: Starter) => void }) {
  return (
    <section aria-labelledby="starters-heading" className="mt-10">
      <h2 id="starters-heading" className="text-sm font-medium text-muted">
        Or start from an idea
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {starters.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-3 text-left transition-[border-color,box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-soft"
            >
              <span
                aria-hidden
                className={cn(
                  "flex aspect-[4/5] w-14 shrink-0 items-end rounded-lg p-1.5 text-[0.55rem] leading-tight font-semibold ring-1 ring-ink/5 transition-transform duration-300 ease-out-expo group-hover:-rotate-3",
                  s.art.bg,
                  s.art.fg,
                )}
              >
                {s.art.line}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{s.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{s.format}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Thread({
  chat,
  onPick,
  showStudioLink,
}: {
  chat: ChatController;
  onPick: (reply: string) => void;
  showStudioLink: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const last = chat.messages.at(-1);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
    if (nearBottom || last?.role === "user" || last?.content === "") {
      el.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  }, [last?.content, last?.tools.length, last?.role]);

  return (
    <ol className="flex-1 space-y-8" aria-live="polite" aria-busy={chat.busy}>
      {chat.messages.map((m, i) => (
        <li key={m.id}>
          {m.role === "user" ? (
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 whitespace-pre-wrap text-paper">
                {m.content}
              </p>
            </div>
          ) : (
            <AssistantMessage
              message={m}
              canPick={i === chat.messages.length - 1 && !chat.busy}
              onPick={onPick}
              onRetry={chat.retry}
              showStudioLink={showStudioLink}
            />
          )}
        </li>
      ))}
      <div ref={endRef} />
    </ol>
  );
}

function AssistantMessage({
  message,
  canPick,
  onPick,
  onRetry,
  showStudioLink,
}: {
  message: UiMessage;
  canPick: boolean;
  onPick: (reply: string) => void;
  onRetry: () => void;
  showStudioLink: boolean;
}) {
  const options = message.tools.find(
    (t): t is Extract<ToolOutcomeData, { ok: true }> => t.ok && t.name === "offer_options",
  )?.output as { question: string; options: { label: string; reply: string }[] } | undefined;
  const thinking = message.status === "streaming" && !message.content && message.tools.length === 0;

  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-teal-500 text-sm font-bold text-ink"
      >
        s
      </span>
      <div className="min-w-0 flex-1 space-y-4 pt-1 leading-relaxed text-ink/90">
        <span className="sr-only">Snip:</span>
        {thinking && (
          <p className="flex items-center gap-1.5 text-muted" role="status">
            <span className="sr-only">Snip is thinking</span>
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                aria-hidden
                className="size-1.5 animate-bounce rounded-full bg-teal-500"
                style={{ animationDelay: `${d * 120}ms` }}
              />
            ))}
          </p>
        )}
        {message.content && (
          <div>
            <RichText text={message.content} />
            {message.status === "streaming" && (
              <span
                aria-hidden
                className="snip-caret ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-teal-500"
              />
            )}
          </div>
        )}
        {options && (
          <div className="space-y-3">
            {!message.content.includes(options.question) && (
              <p className="font-medium text-ink">{options.question}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {options.options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  disabled={!canPick}
                  onClick={() => onPick(o.reply)}
                  className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink transition-[background-color,border-color,color,transform] duration-200 ease-out-expo hover:border-ink hover:bg-ink hover:text-paper active:scale-[0.97] disabled:cursor-default disabled:opacity-50 disabled:hover:border-ink/15 disabled:hover:bg-white disabled:hover:text-ink"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <ToolCards tools={message.tools} showStudioLink={showStudioLink} />
        {message.status === "error" && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertCircle aria-hidden className="size-4 shrink-0" />
            <span className="flex-1">{message.error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
            >
              <RotateCcw aria-hidden className="size-3.5" /> Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
