import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClaimRequestForm } from "@/components/firms/claim-request-form";

// /[city]/firms/[slug]/claim — claim/edit-request intake (T17), a sibling
// route to /edit. Public: unlike /edit, claiming doesn't require an
// existing session (the requester isn't an owner yet) — anyone may submit
// a claim/edit request per firm_change_requests' public-insert policy.
// Untyped until `supabase gen types` (see lib/supabase/server.ts TODO).
type ClaimableFirmRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  cities: { slug: string } | null;
};

export default async function ClaimFirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; slug: string }>;
  searchParams: Promise<{ premium?: string }>;
}) {
  const { city, slug } = await params;
  const { premium } = await searchParams;
  const wantsPremium = premium === "true";

  const supabase = await createClient();
  const { data } = await supabase
    .from("firms")
    .select("id, name, slug, owner_id, cities(slug)")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  const firm = data as unknown as ClaimableFirmRow | null;
  // Already-claimed or unknown firms 404 — the claim CTA only ever renders
  // for unclaimed firms, so a stale link is the only way to land here.
  if (!firm || firm.owner_id !== null || firm.cities?.slug !== city) {
    notFound();
  }

  const firmPath = `/${city}/firms/${slug}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <nav className="text-sm text-muted-foreground">
        <Link href={firmPath} className="hover:text-foreground hover:underline">
          {firm.name}
        </Link>{" "}
        / <span className="text-foreground">Claim this listing</span>
      </nav>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {wantsPremium ? `Claim ${firm.name} & go Premium` : `Claim ${firm.name}`}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {wantsPremium
          ? "Tell us it's your firm and that you're interested in Premium — our team reviews every claim, and once yours is approved you'll be able to upgrade from your listing page."
          : "Let us know it's your firm (or suggest an edit) — our team reviews every request before anything changes on the listing."}
      </p>
      <ClaimRequestForm
        firmId={firm.id}
        firmName={firm.name}
        initialMessage={
          wantsPremium
            ? "I'd like to upgrade to Premium once my claim is approved. "
            : undefined
        }
      />
    </div>
  );
}
