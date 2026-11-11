"use client";

import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { cn } from "./cn";

type ChipProps = Omit<ComponentProps<"button">, "type"> & { selected: boolean };

/** Toggle chip. Announces state with aria-pressed. */
export function Chip({ selected, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 ease-out-expo active:scale-[0.97]",
        selected
          ? "border-ink bg-ink text-paper"
          : "border-line bg-white text-ink hover:border-ink/30",
        className,
      )}
      {...props}
    >
      {selected && <Check aria-hidden className="size-3.5 text-lime" strokeWidth={3} />}
      {children}
    </button>
  );
}
