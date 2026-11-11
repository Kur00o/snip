/**
 * Phase 1 placeholder. The full landing page (animated prompt → carousel demo, bento grid)
 * is built in Phase 7.
 */
export default function Home() {
  return (
    <main
      className="relative isolate flex flex-1 flex-col justify-between overflow-hidden bg-ink px-6 py-8 text-paper sm:px-12 sm:py-10"
      style={{ colorScheme: "dark" }}
    >
      {/* Teal glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 -z-10 h-[90vmax] w-[90vmax] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgb(15 157 143 / 0.55), rgb(15 157 143 / 0.12) 55%, transparent)",
        }}
      />

      <header className="flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">
          snip<span className="text-lime">.</span>
        </span>
        <span className="rounded-full border border-paper/15 px-3 py-1 text-sm text-muted-on-ink">
          Building in public · Phase 1
        </span>
      </header>

      <section className="max-w-5xl py-16">
        <h1 className="text-[clamp(2.75rem,1rem+7vw,7.5rem)] leading-[0.92] font-semibold tracking-[-0.045em]">
          Your whole social team, <span className="text-teal-300">in one chat.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-muted-on-ink">
          Carousels designed for your brand, captions that sound like you, Reels cut from your own
          footage, and posts scheduled to Instagram, Facebook and YouTube.
        </p>
      </section>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-on-ink">
        <span>
          <span className="mr-2 inline-block size-2 rounded-full bg-lime align-middle" />
          Carousels and scheduling first. Reels next.
        </span>
      </footer>
    </main>
  );
}
