import { z } from "zod";

const PublicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof PublicEnv>;

let cached: PublicEnv | undefined;

/**
 * Browser-safe configuration. Parsed lazily so builds without env vars (CI) still work;
 * a missing value fails loudly on first use instead of producing a confusing auth error.
 * Each variable is referenced explicitly so Next.js can inline it into client bundles.
 */
export function publicEnv(): PublicEnv {
  cached ??= PublicEnv.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
