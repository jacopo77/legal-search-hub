import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Server-side Supabase client (anon key, cookie-based auth session).
// Use in Server Components and Route Handlers. Create a fresh client per
// call — never share one across requests.
// TODO(T3+): add a generated Database type parameter once the schema
// migration exists (`supabase gen types typescript`).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabase.url(), env.supabase.anonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies can't be written.
          // Safe to ignore as long as session refresh is handled by
          // middleware (see proxy/middleware setup when auth lands in T14).
        }
      },
    },
  });
}
