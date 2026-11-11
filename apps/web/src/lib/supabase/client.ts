"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@snip/db";
import { publicEnv } from "@/lib/env";

/** Supabase client for Client Components. Uses the publishable key; RLS does the rest. */
export function createClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
