import { Camera, Play, ThumbsUp } from "lucide-react";
import type { Platform } from "@snip/db";
import { cn } from "./ui/cn";

const ICONS = { instagram: Camera, facebook: ThumbsUp, youtube: Play } as const;

/** Neutral glyph per platform (we don't redraw the platforms' own logos). */
export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const Icon = ICONS[platform];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-10 place-items-center rounded-xl bg-ink text-paper",
        className,
      )}
    >
      <Icon className="size-[1.1rem]" strokeWidth={2.2} />
    </span>
  );
}
