"use client";

import { forwardRef, type FormEvent } from "react";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import { cn } from "@/components/ui/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy?: boolean;
  size?: "lg" | "md";
  placeholder?: string;
  autoFocus?: boolean;
};

/** The chat input. Enter sends, Shift+Enter adds a line; the send button turns into Stop. */
export const PromptBox = forwardRef<HTMLTextAreaElement, Props>(function PromptBox(
  { value, onChange, onSubmit, onStop, busy = false, size = "lg", placeholder, autoFocus },
  ref,
) {
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy) onSubmit();
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="prompt" className="sr-only">
        Message Snip
      </label>
      <div className="rounded-[1.25rem] bg-gradient-to-br from-teal-500/60 via-line to-lime/60 p-px shadow-soft transition-shadow duration-300 focus-within:shadow-glow">
        <div className="rounded-[calc(1.25rem-1px)] bg-white">
          <textarea
            ref={ref}
            id="prompt"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={size === "lg" ? 3 : 1}
            maxLength={2000}
            placeholder={placeholder ?? "Make a carousel about our monsoon menu…"}
            autoFocus={autoFocus}
            className={cn(
              "block [field-sizing:content] max-h-64 w-full resize-none rounded-[inherit] bg-transparent px-5 text-ink placeholder:text-muted/70 focus:outline-none",
              size === "lg" ? "min-h-28 pt-5 pb-2 text-lg" : "min-h-12 pt-3.5 pb-1 text-base",
            )}
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <p className="flex items-center gap-1.5 text-sm text-muted">
              {size === "lg" ? (
                <>
                  <Sparkles aria-hidden className="size-4 text-teal-700" />
                  Carousels, captions, Reel scripts
                </>
              ) : (
                <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
              )}
            </p>
            {busy ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop"
                className="grid size-10 place-items-center rounded-xl bg-ink text-paper transition-colors hover:bg-ink-800"
              >
                <Square aria-hidden className="size-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                disabled={!value.trim()}
                className="grid size-10 place-items-center rounded-xl bg-ink text-paper transition-[background-color,color,transform] duration-200 ease-out-expo hover:bg-teal-500 hover:text-ink active:scale-95 disabled:bg-ink/20 disabled:text-paper"
              >
                <ArrowUp aria-hidden className="size-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
});
