"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground";

// Magic-link sign-in form. Passwordless: the only way into an owner or
// admin account is the email link, which lands on /auth/callback.
export function SignInForm({ hasLinkError }: { hasLinkError: boolean }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const email = new FormData(event.currentTarget)
      .get("email")
      ?.toString()
      .trim();
    if (!email) {
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Sign-in only — new accounts come from the List Your Firm flow,
        // never from this form.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);
    if (otpError) {
      // Supabase returns 429/over_email_send_rate_limit on repeat requests
      // for the same email (confirmed empirically — the second request
      // within ~60s always 429s). The generic "try again" message is
      // actively wrong advice here since an immediate retry just re-hits
      // the same limit.
      setError(
        otpError.status === 429
          ? "Too many attempts — please wait a few minutes before trying again."
          : "Could not send the sign-in link — please try again.",
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
        If an account exists for that email, a sign-in link is on its way.
        The link expires soon, so open it in this browser.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {hasLinkError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          That sign-in link didn&apos;t work — it may have expired. Request a
          new one below.
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
