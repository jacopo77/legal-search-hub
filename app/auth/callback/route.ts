import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// GET /auth/callback — magic-link landing route. Supabase emails a link
// that bounces through supabase's /auth/v1/verify and lands here with
// ?code=…; we exchange it for the session cookie and send the user on.
// `next` is an optional relative redirect target (e.g. back to the firm
// page the owner was on) — absolute URLs are rejected to keep this from
// becoming an open redirect.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("auth/callback: code exchange failed", error);
    return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
  }

  return NextResponse.redirect(new URL(target, url.origin));
}
