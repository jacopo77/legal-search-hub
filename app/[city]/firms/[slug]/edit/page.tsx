import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PremiumEditForm } from "@/components/firms/premium-edit-form";

// /[city]/firms/[slug]/edit — premium profile editing (T20). Owner-only:
// anyone else (including signed-out visitors) gets a 404, matching the
// admin queue's pattern rather than leaking that the route exists. Free
// owners get an upgrade prompt instead of the form — every field here is
// premium-only.
// Untyped until `supabase gen types` (see lib/supabase/server.ts TODO).
type EditableFirmRow = {
  id: string;
  name: string;
  slug: string;
  tier: "free" | "premium";
  owner_id: string | null;
  bio_long: string | null;
  logo_url: string | null;
  cities: { slug: string } | null;
  firm_practice_areas: { practice_area_id: string }[];
  firm_gallery_images: { id: string; image_url: string; sort_order: number }[];
};

export default async function EditFirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const [{ city, slug }, { checkout }] = await Promise.all([
    params,
    searchParams,
  ]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // The owner can read their own firm via RLS regardless of status, so the
  // session client suffices — no service-role read needed here.
  const { data } = await supabase
    .from("firms")
    .select(
      `id, name, slug, tier, owner_id, bio_long, logo_url,
       cities(slug),
       firm_practice_areas(practice_area_id),
       firm_gallery_images(id, image_url, sort_order)`,
    )
    .eq("slug", slug)
    .maybeSingle();
  const firm = data as unknown as EditableFirmRow | null;
  if (!firm || firm.owner_id !== user.id || firm.cities?.slug !== city) {
    notFound();
  }

  const firmPath = `/${city}/firms/${slug}`;

  // Post-checkout race-condition guard: Stripe redirects here immediately,
  // but the webhook (T19) may still be in flight. Don't show the "Premium
  // only" gate to someone who just paid — give them a waiting state.
  const isActivating = checkout === "success" && firm.tier !== "premium";
  const checkoutError = checkout === "error";

  if (firm.tier !== "premium" && !isActivating) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Premium only</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Logo, gallery, multiple practice areas, and the long bio are
          Premium features. Upgrade from your listing page to unlock them.
        </p>
        <Link
          href={firmPath}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to your listing →
        </Link>
      </div>
    );
  }

  const { data: practiceAreas } = await supabase
    .from("practice_areas")
    .select("id, name")
    .order("sort_order");

  const gallery = [...firm.firm_gallery_images].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {checkoutError && (
        <p className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
          Something went wrong starting checkout — please try again.
        </p>
      )}
      {isActivating && (
        <div className="mb-6 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
          <p className="text-sm leading-6">
            Payment received — your Premium features are activating. This
            usually takes a few seconds.
          </p>
          <a
            href={firmPath}
            className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
          >
            Refresh to edit your profile →
          </a>
        </div>
      )}
      <nav className="text-sm text-muted-foreground">
        <Link href={firmPath} className="hover:text-foreground hover:underline">
          {firm.name}
        </Link>{" "}
        / <span className="text-foreground">Edit premium profile</span>
      </nav>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        Edit premium profile
      </h1>
      {isActivating ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            Your Premium edit form will appear here once activation
            completes.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <PremiumEditForm
            firmId={firm.id}
            firmName={firm.name}
            firmPath={firmPath}
            initialBioLong={firm.bio_long}
            initialLogoUrl={firm.logo_url}
            practiceAreas={(practiceAreas ?? []) as { id: string; name: string }[]}
            selectedAreaIds={firm.firm_practice_areas.map(
              (a) => a.practice_area_id,
            )}
            gallery={gallery.map((g) => ({ id: g.id, imageUrl: g.image_url }))}
          />
        </div>
      )}
    </div>
  );
}
