import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client: bypasses RLS. Server-only — never import from a
// Client Component. Use for webhook handlers (Stripe), cron routes (Google
// Places sync), and admin operations that must act outside a user session.
export function createAdminClient() {
  return createSupabaseClient(
    env.supabase.url(),
    env.supabase.serviceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
