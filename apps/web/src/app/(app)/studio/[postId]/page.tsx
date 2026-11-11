import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { CarouselStudio } from "@/components/studio/carousel-studio";
import { requireBusiness } from "@/lib/auth";
import { loadCarousel, rowToSlide, slideBrandFor } from "@/lib/carousel";
import { createClient } from "@/lib/supabase/server";
import {
  approveAction,
  getRenderState,
  renderAction,
  saveCaptionAction,
  saveSlidesAction,
} from "./actions";

export const metadata: Metadata = { title: "Carousel studio" };

export default function StudioPage({ params }: PageProps<"/studio/[postId]">) {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto h-[36rem] max-w-6xl animate-pulse rounded-2xl bg-ink/5"
          aria-busy="true"
        />
      }
    >
      <Studio params={params} />
    </Suspense>
  );
}

async function Studio({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!z.uuid().safeParse(postId).success) notFound();
  const business = await requireBusiness();
  const db = await createClient();
  const loaded = await loadCarousel(db, postId);
  if (!loaded) notFound();

  const [brand, renderState] = await Promise.all([
    slideBrandFor(db, business),
    getRenderState(postId),
  ]);

  return (
    <CarouselStudio
      postId={postId}
      conversationId={loaded.post.conversation_id}
      brand={brand}
      initialSlides={loaded.rows.map(rowToSlide)}
      initialCaption={loaded.post.caption ?? ""}
      initialHashtags={loaded.post.hashtags}
      initialRender={renderState}
      actions={{
        saveSlides: saveSlidesAction,
        saveCaption: saveCaptionAction,
        render: renderAction,
        approve: approveAction,
        getRenderState,
      }}
    />
  );
}
