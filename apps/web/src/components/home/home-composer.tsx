"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { Starter } from "@/lib/starters";

/**
 * The chat-first prompt box and the starter cards that fill it.
 * Phase 4 connects this to the agent's streaming chat endpoint.
 */
export function HomeComposer({ starters }: { starters: Starter[] }) {
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) {
      inputRef.current?.focus();
      return;
    }
    setNotice("Snip's agent switches on in the next update. This box will start creating then.");
  }

  function applyStarter(s: Starter) {
    setPrompt(s.prompt);
    setNotice(null);
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit}>
        <label htmlFor="prompt" className="sr-only">
          What should Snip make?
        </label>
        <div className="group relative rounded-[1.25rem] bg-gradient-to-br from-teal-500/60 via-line to-lime/60 p-px shadow-soft transition-shadow duration-300 focus-within:shadow-glow">
          <div className="rounded-[calc(1.25rem-1px)] bg-white">
            <textarea
              ref={inputRef}
              id="prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setNotice(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={3}
              placeholder="Make a carousel about our monsoon menu…"
              className="block max-h-64 min-h-28 w-full resize-none rounded-[inherit] bg-transparent px-5 pt-5 pb-2 text-lg text-ink placeholder:text-muted/70 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 px-4 pb-4">
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <Sparkles aria-hidden className="size-4 text-teal-700" />
                Carousels, captions, Reel scripts
              </p>
              <button
                type="submit"
                aria-label="Send"
                className="grid size-10 place-items-center rounded-xl bg-ink text-paper transition-[background-color,transform] duration-200 ease-out-expo hover:bg-teal-500 hover:text-ink active:scale-95"
              >
                <ArrowUp aria-hidden className="size-5" />
              </button>
            </div>
          </div>
        </div>
        {notice && (
          <p role="status" className="mt-3 text-sm text-muted">
            {notice}
          </p>
        )}
      </form>

      <section aria-labelledby="starters-heading">
        <h2 id="starters-heading" className="text-sm font-medium text-muted">
          Or start from an idea
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {starters.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => applyStarter(s)}
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
    </div>
  );
}
