import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Globe, Phone, MapPin, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GoogleRatingBadge } from "@/components/listings/google-rating-badge";
import { ClaimRequestForm } from "@/components/firms/claim-request-form";
import { Button } from "@/components/ui/button";

// Full firm profile (ARCHITECTURE.md §4.4). Public readers only ever see
// status='live' rows — that filter stays here in the query layer.
// Untyped until `supabase gen types` (see lib/supabase/server.ts TODO).
type FirmDetailRow = {
  id: string;
  slug: string;
  name: string;
  tier: "free" | "premium";
  owner_id: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  hours: Record<string, string> | null;
  bio_short: string | null;
  bio_long: string | null;
  logo_url: string | null;
  bar_number: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  firm_practice_areas: {
    practice_areas: { slug: string; name: string } | null;
  }[];
  firm_gallery_images: { id: string; image_url: string; sort_order: number }[];
};

const DAY_LABELS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

async function getFirm(citySlug: string, firmSlug: string) {
  const supabase = await createClient();
  const { data: city } = await supabase
    .from("cities")
    .select("id, slug, status")
    .eq("slug", citySlug)
    .maybeSingle();
  if (!city || city.status !== "live") return null;

  const { data, error } = await supabase
    .from("firms")
    .select(
      `id, slug, name, tier, owner_id, phone, address, website, hours,
       bio_short, bio_long, logo_url, bar_number,
       google_rating, google_review_count,
       firm_practice_areas(practice_areas(slug, name)),
       firm_gallery_images(id, image_url, sort_order)`,
    )
    .eq("city_id", city.id)
    .eq("slug", firmSlug)
    .eq("status", "live")
    .maybeSingle();
  if (error) {
    console.error(`FirmDetail: query failed for ${citySlug}/${firmSlug}`, error);
    return null;
  }
  return data as unknown as FirmDetailRow | null;
}

export async function FirmDetail({
  citySlug,
  firmSlug,
  checkoutStatus,
}: {
  citySlug: string;
  firmSlug: string;
  // Set by /api/billing/checkout's redirect back from Stripe (T18).
  checkoutStatus?: string;
}) {
  const firm = await getFirm(citySlug, firmSlug);
  if (!firm) notFound();

  // Owner-only UI (upgrade button) — a second client just for the session
  // read; the firm data above is public and came through the anon path.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user !== null && firm.owner_id === user.id;

  const isPremium = firm.tier === "premium";
  const practiceAreas = firm.firm_practice_areas
    .map((l) => l.practice_areas)
    .filter((a) => a !== null);
  const gallery = [...firm.firm_gallery_images].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  // Premium-only long bio, falling back to the short one (§4.4).
  const bio = (isPremium && firm.bio_long) || firm.bio_short;

  return (
    <article className="mx-auto max-w-6xl px-4 py-10">
      {checkoutStatus === "success" && (
        <p className="mb-6 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm leading-6">
          Payment received — this listing moves to Premium as soon as Stripe
          confirms the subscription (usually a few seconds).
        </p>
      )}
      {checkoutStatus === "error" && (
        <p className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
          Something went wrong starting checkout — please try again.
        </p>
      )}
      <nav className="text-sm text-muted-foreground">
        <Link href={`/${citySlug}`} className="hover:text-foreground hover:underline">
          {citySlug.charAt(0).toUpperCase() + citySlug.slice(1)} firms
        </Link>{" "}
        / <span className="text-foreground">{firm.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-start gap-5">
            {isPremium && firm.logo_url && (
              <Image
                src={firm.logo_url}
                alt={`${firm.name} logo`}
                width={80}
                height={80}
                className="size-20 shrink-0 rounded-xl border border-border object-contain"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {firm.name}
                </h1>
                {isPremium && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    Premium
                  </span>
                )}
              </div>
              <div className="mt-1">
                <GoogleRatingBadge
                  rating={firm.google_rating}
                  reviewCount={firm.google_review_count}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {practiceAreas.map((area) => (
                  <Link
                    key={area.slug}
                    href={`/${citySlug}?practiceArea=${area.slug}`}
                    className="rounded-full bg-muted px-3 py-1 text-sm font-medium hover:bg-muted/70"
                  >
                    {area.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {bio && (
            <p className="mt-6 max-w-2xl leading-7 text-foreground/90">
              {bio}
            </p>
          )}

          {firm.bar_number && (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <BadgeCheck className="size-4" aria-hidden />
              AZ Bar #{firm.bar_number} (self-reported)
            </p>
          )}

          {/* Gallery: premium only (§4.6). */}
          {isPremium && gallery.length > 0 && (
            <section aria-labelledby="gallery-heading" className="mt-10">
              <h2 id="gallery-heading" className="text-lg font-semibold">
                Photos
              </h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((image) => (
                  <li
                    key={image.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border"
                  >
                    <Image
                      src={image.image_url}
                      alt={`${firm.name} office photo`}
                      fill
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Owner upgrade CTA (T18): only the signed-in owner of a live,
              free-tier listing sees this. Plain form POST → 303 to Stripe;
              the tier flips in the webhook (T19). */}
          {isOwner && firm.tier === "free" && (
            <section
              aria-labelledby="upgrade-heading"
              className="mt-10 rounded-xl border border-border bg-card p-6"
            >
              <h2 id="upgrade-heading" className="text-lg font-semibold">
                Upgrade to Premium
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add your logo, a photo gallery, multiple practice areas, a
                longer bio, and a contact form on this page.
              </p>
              <form action="/api/billing/checkout" method="POST" className="mt-4">
                <input type="hidden" name="firmId" value={firm.id} />
                <Button type="submit">Upgrade to Premium</Button>
              </form>
            </section>
          )}

          {/* Claim/edit intake (T17): only on unclaimed listings
              (owner_id null). */}
          {firm.owner_id === null && (
            <section
              id="claim"
              aria-labelledby="claim-heading"
              className="mt-10 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6"
            >
              <h2 id="claim-heading" className="text-lg font-semibold">
                Is this your firm?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Claim this listing to update your info, or suggest an edit.
                Every request is reviewed by our team before anything changes.
              </p>
              <ClaimRequestForm firmId={firm.id} firmName={firm.name} />
            </section>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Contact</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {firm.phone && (
              <li>
                <a
                  href={`tel:${firm.phone.replace(/[^0-9+]/g, "")}`}
                  className="flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  <Phone className="size-4 shrink-0" aria-hidden />
                  {firm.phone}
                </a>
              </li>
            )}
            {firm.address && (
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                {firm.address}
              </li>
            )}
            {firm.website && (
              <li>
                <a
                  href={firm.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="size-4 shrink-0" aria-hidden />
                  Visit website
                </a>
              </li>
            )}
          </ul>

          {firm.hours && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Hours</h3>
              <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                {DAY_LABELS.filter(([key]) => firm.hours?.[key]).map(
                  ([key, label]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt>{label}</dt>
                      <dd>{firm.hours?.[key]}</dd>
                    </div>
                  ),
                )}
              </dl>
            </>
          )}

          {/* T21: premium "Contact this firm" lead form goes here */}
        </aside>
      </div>
    </article>
  );
}
