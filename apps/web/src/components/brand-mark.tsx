import { cn } from "./ui/cn";

/**
 * The "snip." wordmark. The dot is the one bit of brand flair that appears everywhere:
 * lime on dark surfaces, teal on light ones (lime disappears on off-white).
 */
export function BrandMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("text-xl font-semibold tracking-[-0.03em]", className)}>
      snip<span className={onDark ? "text-lime" : "text-teal-500"}>.</span>
    </span>
  );
}
