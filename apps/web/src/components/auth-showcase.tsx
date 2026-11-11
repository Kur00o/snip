import { BrandMark } from "./brand-mark";

/**
 * Left panel of the login screen: a real product slice (a prompt turning into a
 * carousel) instead of an illustration. Pure CSS; motion is disabled for reduced motion.
 */
export function AuthShowcase() {
  return (
    <div className="relative isolate flex h-full flex-col justify-between overflow-hidden bg-ink p-10 text-paper xl:p-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-24 -z-10 size-[42rem] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgb(15 157 143 / 0.6), rgb(15 157 143 / 0.12) 60%, transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-[-12rem] -z-10 size-[30rem] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgb(198 244 50 / 0.35), transparent)" }}
      />

      <BrandMark onDark className="text-2xl" />

      <div className="my-10">
        <div className="snip-rise max-w-sm rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-[0.95rem] text-paper ring-1 ring-white/15 backdrop-blur">
          Make a carousel about our monsoon menu for Instagram
          <span
            aria-hidden
            className="snip-caret ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-lime"
          />
        </div>

        <div aria-hidden className="relative mt-10 h-72 w-[26rem] max-w-full">
          <MiniSlide
            className="top-8 left-0 -rotate-6 bg-paper text-ink"
            delay={350}
            kicker="02 · Combos"
            title="Masala chai + vada pav"
            foot="₹79 till 7pm"
          />
          <MiniSlide
            className="top-6 left-[15rem] rotate-6 bg-ink-800 text-paper ring-1 ring-white/10"
            delay={500}
            kicker="03 · Save this"
            title="4 rainy-day combos →"
            foot="Swipe"
            accent
          />
          <MiniSlide
            className="top-0 left-[7.5rem] z-10 bg-teal-500 text-ink shadow-glow"
            delay={200}
            kicker="Chai Point · Pune"
            title="The monsoon menu is here"
            foot="Swipe →"
          />
        </div>
      </div>

      <div>
        <p className="text-[clamp(1.75rem,1rem+1.6vw,2.5rem)] leading-[1.02] font-semibold tracking-[-0.04em]">
          Your whole social team,
          <br />
          <span className="text-teal-300">in one chat.</span>
        </p>
        <p className="mt-4 max-w-sm text-muted-on-ink">
          Carousels in your brand, captions in your voice, Reels from your own footage, posted on
          time.
        </p>
      </div>
    </div>
  );
}

function MiniSlide({
  className,
  kicker,
  title,
  foot,
  delay,
  accent = false,
}: {
  className: string;
  kicker: string;
  title: string;
  foot: string;
  delay: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`snip-fan absolute flex aspect-[4/5] w-44 flex-col justify-between rounded-2xl p-4 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-[0.65rem] font-medium tracking-wide uppercase opacity-70">
        {kicker}
      </span>
      <span className="text-lg leading-[1.05] font-semibold tracking-[-0.03em]">{title}</span>
      <span className={`text-xs font-medium ${accent ? "text-lime" : "opacity-70"}`}>{foot}</span>
    </div>
  );
}
