"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Browser-side Supabase client (anon key, cookie-based auth session).
// Safe for Client Components — uses only NEXT_PUBLIC_* vars.
// TODO(T3+): add a generated Database type parameter once the schema
// migration exists (`supabase gen types typescript`).
export function createClient() {
  return createBrowserClient(env.supabase.url(), env.supabase.anonKey());
}
