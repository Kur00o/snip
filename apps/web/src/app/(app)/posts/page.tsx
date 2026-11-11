import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { renderSlide } from "@snip/templates";
import { PageHeader } from "@/components/page-header";
import { FluidSlideFrame } from "@/components/studio/slide-frame";
import { ButtonLink } from "@/components/ui/button";
import { requireBusiness } from "@/lib/auth";
import { rowToSlide, slideBrandFor } from "@/lib/carousel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Posts" };

const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-ink/5 text-muted" },
  review: { label: "Ready to review", className: "bg-teal-500/15 text-teal-700" },
  approved: { label: "Approved", className: "bg-lime text-ink" },
  scheduled: { label: "Scheduled", className: "bg-ink text-paper" },
  published: { label: "Published", className: "bg-ink text-paper" },
  failed: { label: "Failed", className: "bg-red-50 text-red-800" },
};

export default function PostsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Posts"
        lead="Everything Snip has made for you. Open one to edit, render and approve it."
        action={<ButtonLink href="/home">New post</ButtonLink>}
      />
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink/5" aria-busy="true" />}
      >
        <Posts />
      </Suspense>
    </div>
  );
}

async function Posts() {
  const business = await requireBusiness();
  const db = await createClient();
  const { data: posts } = await db
    .from("posts")
    .select("id, type, status, created_at, slides(headline, body, layout, position)")
    .eq("type", "carousel")
    .order("created_at", { ascending: false })
    .limit(48);

  if (!posts?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-medium text-ink">No posts yet</p>
        <p className="mt-1 text-sm text-muted">
          Ask Snip for a carousel on the home page and it shows up here.
        </p>
      </div>
    );
  }

  const brand = await slideBrandFor(db, business);
  return (
    <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {posts.map((post) => {
        const slides = [...(post.slides ?? [])].sort((a, b) => a.position - b.position);
        const cover = slides[0];
        const status = STATUS[post.status] ?? {
          label: post.status,
          className: "bg-ink/5 text-muted",
        };
        return (
          <li key={post.id}>
            <Link href={`/studio/${post.id}`} className="group block">
              <div className="overflow-hidden rounded-xl shadow-soft ring-1 ring-ink/10 transition-transform duration-300 ease-out-expo group-hover:-translate-y-1">
                {cover ? (
                  <FluidSlideFrame
                    html={renderSlide({
                      slide: rowToSlide(cover),
                      brand,
                      index: 0,
                      total: slides.length,
                    })}
                    title={cover.headline ?? "Carousel cover"}
                  />
                ) : (
                  <div className="aspect-[4/5] bg-ink/5" />
                )}
              </div>
              <p className="mt-3 truncate font-medium text-ink">
                {cover?.headline || "Untitled carousel"}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
                {slides.length} slides
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
