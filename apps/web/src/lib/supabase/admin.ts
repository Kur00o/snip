import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@snip/db";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS: only use it for server-only work such as Vault
 * token RPCs, and always check ownership with the user's own client first.
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set. Add it to apps/web/.env.local and Vercel.");
  }
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
