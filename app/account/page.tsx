import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/nav/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Account — Legal Search Hub",
};

// /account — signed-in owner hub (UX review 2026-07-31, Feature Gap #5):
// the only nav destination once logged in, so it just needs to get an
// owner to their listing(s) and let them sign out. Unlike /[city]/firms/
// [slug]/edit (owner-only, 404s for everyone else), this is a general
// account destination reachable from the nav — a signed-out visitor gets
// redirected to sign in rather than a 404, since there's no specific
// resource being hidden here.
type OwnedFirmRow = {
  id: string;
  slug: string;
  name: string;
  tier: "free" | "premium";
  status: "pending" | "live" | "rejected" | "suspended";
  cities: { slug: string; name: string } | null;
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Schema allows one owner to hold multiple firms (profiles.stripe_customer_id
  // lives on the owner for exactly this reason — see ARCHITECTURE.md §4) even
  // though no signup flow creates more than one today, so this lists all of
  // them rather than assuming a single owned firm.
  const { data } = await supabase
    .from("firms")
    .select("id, slug, name, tier, status, cities(slug, name)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });
  const firms = (data ?? []) as unknown as OwnedFirmRow[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <section aria-labelledby="my-listings-heading" className="mt-10">
        <h2 id="my-listings-heading" className="text-lg font-semibold">
          My Listings
        </h2>

        {firms.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
            <Building2 className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">
              You don&apos;t have a listed firm yet.
            </p>
            <Link
              href="/list-your-firm"
              className={cn(buttonVariants({ variant: "outline-navy" }))}
            >
              List Your Firm
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {firms.map((firm) => (
              <li
                key={firm.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{firm.name}</p>
                    {firm.tier === "premium" && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Premium
                      </span>
                    )}
                    {firm.status !== "live" && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {firm.status === "pending"
                          ? "Pending review"
                          : firm.status === "suspended"
                            ? "Suspended"
                            : "Not listed"}
                      </span>
                    )}
                  </div>
                  {firm.cities && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {firm.cities.name}
                    </p>
                  )}
                </div>
                {firm.cities && (
                  <Link
                    href={`/${firm.cities.slug}/firms/${firm.slug}`}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    Manage listing →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="account-settings-heading" className="mt-10">
        <h2 id="account-settings-heading" className="text-lg font-semibold">
          Account
        </h2>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user.email}</span>
          </p>
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
