"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Standalone sign-out control for the account page — same signOut()/
// redirect/refresh sequence as AccountMenu's dropdown item, just not worth
// sharing as a hook for six lines used in two places.
export function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleSignOut} disabled={signingOut}>
      <LogOut className="size-4" aria-hidden />
      {signingOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
