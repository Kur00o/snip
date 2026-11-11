"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

/**
 * A slide's HTML shown at any width. The 1080×1350 document is scaled down with CSS, and
 * the iframe is fully sandboxed (no scripts, no same-origin access).
 */
export function SlideFrame({
  html,
  width,
  title,
  className,
}: {
  html: string;
  width: number;
  title: string;
  className?: string;
}) {
  const scale = width / 1080;
  return (
    <div
      className={cn("relative overflow-hidden bg-ink/5", className)}
      style={{ width, height: Math.round(width * 1.25) }}
    >
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 border-0"
        style={{ width: 1080, height: 1350, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      />
      <span className="sr-only">{title}</span>
    </div>
  );
}

/** Full-width slide preview that keeps the 4:5 ratio at any container size. */
export function FluidSlideFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="aspect-[4/5] w-full">
      {width > 0 && <SlideFrame html={html} width={width} title={title} />}
    </div>
  );
}
