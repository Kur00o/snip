import Link from "next/link";
import { ArrowRight, Hash, LayoutTemplate, PenLine } from "lucide-react";
import type { ToolOutcomeData } from "@/lib/sse";

type Ok = Extract<ToolOutcomeData, { ok: true }>;

type PlanOutput = { postId: string; title: string; slides: { headline: string }[] };
type EditOutput = { postId: string; changed: number[]; slideCount: number };
type CaptionOutput = { postId?: string; caption: string; hashtags: string[] };

/** Cards for what the agent made: carousel drafts, edits and captions. */
export function ToolCards({
  tools,
  showStudioLink = true,
}: {
  tools: ToolOutcomeData[];
  showStudioLink?: boolean;
}) {
  const ok = tools.filter((t): t is Ok => t.ok);
  return (
    <>
      {ok.map((t, i) => {
        if (t.name === "plan_carousel") {
          const o = t.output as PlanOutput;
          return (
            <CarouselCard
              key={i}
              postId={o.postId}
              title={o.title}
              headlines={o.slides.map((s) => s.headline)}
              showLink={showStudioLink}
            />
          );
        }
        if (t.name === "edit_carousel") {
          const o = t.output as EditOutput;
          return (
            <div
              key={i}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm"
            >
              <PenLine aria-hidden className="size-4 text-teal-700" />
              <span className="flex-1 text-ink">
                Updated slide{o.changed.length > 1 ? "s" : ""} {o.changed.join(", ")} ·{" "}
                {o.slideCount} slides
              </span>
              {showStudioLink && <StudioLink postId={o.postId} />}
            </div>
          );
        }
        if (t.name === "write_caption_and_hashtags") {
          const o = t.output as CaptionOutput;
          return (
            <div key={i} className="rounded-2xl border border-line bg-white p-4 text-sm">
              <p className="mb-2 flex items-center gap-2 font-medium text-ink">
                <Hash aria-hidden className="size-4 text-teal-700" /> Caption
              </p>
              <p className="whitespace-pre-wrap text-ink/85">{o.caption}</p>
              <p className="mt-2 text-teal-700">{o.hashtags.join(" ")}</p>
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

function CarouselCard({
  postId,
  title,
  headlines,
  showLink,
}: {
  postId: string;
  title: string;
  headlines: string[];
  showLink: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex gap-2 overflow-x-auto bg-ink p-3">
        {headlines.map((h, i) => (
          <div
            key={i}
            className={`flex aspect-[4/5] w-24 shrink-0 flex-col justify-end rounded-lg p-2 text-[0.6rem] leading-tight font-semibold ${
              i === 0
                ? "bg-teal-500 text-ink"
                : i === headlines.length - 1
                  ? "bg-lime text-ink"
                  : "bg-paper text-ink"
            }`}
          >
            <span className="mb-auto text-[0.55rem] opacity-60">{i + 1}</span>
            {h}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <LayoutTemplate aria-hidden className="size-4 text-teal-700" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{title}</p>
          <p className="text-sm text-muted">Carousel draft · {headlines.length} slides</p>
        </div>
        {showLink && <StudioLink postId={postId} />}
      </div>
    </div>
  );
}

function StudioLink({ postId }: { postId: string }) {
  return (
    <Link
      href={`/studio/${postId}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-sm font-medium text-paper transition-colors hover:bg-teal-500 hover:text-ink"
    >
      Open in studio <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}
