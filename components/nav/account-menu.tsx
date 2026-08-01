"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, CircleUser, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Signed-in nav state: replaces "Login / Register" once a session exists.
// Owner-only controls elsewhere already read auth correctly (firm-detail,
// edit pages) — this was the one place that never checked at all, so a
// signed-in owner had no way to tell they were logged in or to sign out.
export function AccountMenu({ email }: { email: string }) {
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
    <Menu.Root>
      <Menu.Trigger
        disabled={signingOut}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
      >
        <CircleUser className="size-4" aria-hidden />
        <span className="max-w-[160px] truncate">{email}</span>
        <ChevronDown className="size-4 opacity-60" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end">
          <Menu.Popup className="min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md">
            <Menu.LinkItem
              href="/account"
              closeOnClick
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-highlighted:bg-muted"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              My account
            </Menu.LinkItem>
            <Menu.Item
              onClick={handleSignOut}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-highlighted:bg-muted"
            >
              <LogOut className="size-4" aria-hidden />
              {signingOut ? "Signing out…" : "Sign out"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
