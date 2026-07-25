import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

// Next.js 16 renamed middleware to "proxy" (see
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
//
// Refreshes the Supabase auth session cookie on every request so Server
// Components and Route Handlers always see a valid session — the server
// client in lib/supabase/server.ts can't write cookies from a Server
// Component, so this is the write path its comment refers to.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.supabase.url(),
    env.supabase.anonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session if expired. Per supabase-ssr docs, don't run other
  // code between createServerClient and getUser — it can leave the session
  // in a random state.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
