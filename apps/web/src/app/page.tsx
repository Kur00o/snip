import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { buttonClass } from "@/components/ui/button";

/**
 * Pre-launch front door. Signed-in visitors are sent to /home by the proxy.
 * The full landing page (animated prompt → carousel demo, bento grid) is Phase 7.
 */
export default function Home() {
  return (
    <main
      className="relative isolate flex flex-1 flex-col justify-between overflow-hidden bg-ink px-6 py-8 text-paper sm:px-12 sm:py-10"
      style={{ colorScheme: "dark" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 -z-10 h-[90vmax] w-[90vmax] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgb(15 157 143 / 0.55), rgb(15 157 143 / 0.12) 55%, transparent)",
        }}
      />

      <header className="flex items-center justify-between gap-4">
        <BrandMark onDark className="text-2xl" />
        <Link
          href="/login"
          className="rounded-xl px-4 py-2 text-sm font-medium text-paper ring-1 ring-white/20 transition-colors hover:bg-white/10"
        >
          Sign in
        </Link>
      </header>

      <section className="max-w-5xl py-16">
        <h1 className="text-[clamp(2.75rem,1rem+7vw,7.5rem)] leading-[0.92] font-semibold tracking-[-0.045em]">
          Your whole social team, <span className="text-teal-300">in one chat.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted-on-ink">
          Carousels designed for your brand, captions that sound like you, Reels cut from your own
          footage, and posts scheduled to Instagram, Facebook and YouTube.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/login" className={buttonClass("primary", "lg", "shadow-glow")}>
            Get started free <ArrowRight aria-hidden className="size-4" />
          </Link>
          <span className="text-sm text-muted-on-ink">No card needed. Set up in two minutes.</span>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-on-ink">
        <span>
          <span className="mr-2 inline-block size-2 rounded-full bg-lime align-middle" />
          Free during beta · Made in Pune
        </span>
      </footer>
    </main>
  );
}
