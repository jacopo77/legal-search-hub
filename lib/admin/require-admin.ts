import { createClient } from "@/lib/supabase/server";

// Shared admin check for the /admin page and its mutation routes (T16).
// Uses the cookie-session client (not the service-role admin client) so
// `public.is_admin()` evaluates against the caller's own auth.uid() — the
// same bypass path the guard triggers and RLS admin policies already grant.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, isAdmin: false as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, isAdmin: profile?.role === "admin" };
}
