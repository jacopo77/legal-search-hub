import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Globe, Phone, MapPin, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { GoogleRatingBadge } from "@/components/listings/google-rating-badge";
import { LeadForm } from "@/components/firms/lead-form";
import { FirmMap } from "@/components/firms/firm-map";
import { LogoUploadForm } from "@/components/firms/logo-upload-form";
import { BioEditForm } from "@/components/firms/bio-edit-form";
import { PremiumUpgradeModal } from "@/components/firms/premium-upgrade-modal";
import { buttonVariants } from "@/components/ui/button";
import { ShimmerImage } from "@/components/ui/shimmer-image";
import { cn } from "@/lib/utils";

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
  google_place_id: string | null;
  firm_practice_areas: {
    practice_areas: { slug: string; name: string } | null;
  }[];
  firm_gallery_images: { id: string; image_url: string; sort_order: number }[];
};

// city name/state are joined in for the JSON-LD PostalAddress below, not
// for display — the page already gets the city label from the route slug.
type FirmDetailWithCity = FirmDetailRow & { cityName: string; cityState: string };

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
    .select("id, slug, name, state, status")
    .eq("slug", citySlug)
    .maybeSingle();
  if (!city || city.status !== "live") return null;

  const { data, error } = await supabase
    .from("firms")
    .select(
      `id, slug, name, tier, owner_id, phone, address, website, hours,
       bio_short, bio_long, logo_url, bar_number,
       google_rating, google_review_count, google_place_id,
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
  if (!data) return null;
  return {
    ...(data as unknown as FirmDetailRow),
    cityName: city.name,
    cityState: city.state,
  } satisfies FirmDetailWithCity;
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
  // bio_long displays whenever present, regardless of claim status —
  // content depth isn't gated by ownership. It can come from a claimed
  // owner (free or premium) via BioEditForm/PremiumEditForm, or from
  // curated/researched content seeded directly for an unclaimed listing.
  // Editing bio_long is still restricted to claimed owners; this only
  // governs what's displayed.
  const bio = firm.bio_long || firm.bio_short;

  // New intermediate heading tier (UX review 2026-07-31): a real step
  // between the h1 and body text so sparse listings — no bio, no gallery —
  // don't collapse to one type size. Practice areas plus city/state always
  // gives at least the location half, even for firms with no tagged areas.
  const tagline = [
    practiceAreas.length > 0
      ? practiceAreas.map((a) => a.name).join(", ")
      : null,
    `${firm.cityName}, ${firm.cityState}`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Sparse-page layout (UX review): the two-column grid only earns its
  // keep when the left column has real content beyond the header — a bio,
  // premium gallery photos, or an owner viewing their own page (which
  // always renders an editing section below). Without any of those, the
  // left column is just the header sitting next to a much taller Contact
  // sidebar — collapse to one column instead so nothing looks lopsided.
  const hasLeftColumnContent =
    Boolean(bio) || (isPremium && gallery.length > 0) || isOwner;

  // Render-time scheme allowlist: owners can update their own row via
  // PostgREST (RLS), bypassing the signup schema's protocol check — so the
  // href must never trust the DB value (stored-XSS vector).
  const websiteUrl =
    firm.website && /^https?:\/\//i.test(firm.website) ? firm.website : null;

  // JSON-LD structured data (T22): schema.org/Attorney (a LocalBusiness
  // subtype). Only fields the firm actually has are emitted; the rating
  // comes from our cached Google values, never a live call. `address` is
  // structured as PostalAddress (streetAddress from the free-text column,
  // addressLocality/addressRegion from the joined city row) rather than a
  // plain string, since Google's rich-result parser wants the structured
  // form. `image` isn't gated to premium — free-tier owners can upload a
  // logo too (see logo-upload-form.tsx), so any firm with one gets it here.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    name: firm.name,
    url: `${env.site.url()}/${citySlug}/firms/${firm.slug}`,
    ...(firm.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: firm.address,
            addressLocality: firm.cityName,
            addressRegion: firm.cityState,
          },
        }
      : {}),
    ...(firm.phone ? { telephone: firm.phone } : {}),
    ...(firm.website ? { sameAs: [firm.website] } : {}),
    ...(firm.logo_url ? { image: firm.logo_url } : {}),
    ...(firm.google_rating !== null && firm.google_review_count !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: firm.google_rating,
            reviewCount: firm.google_review_count,
          },
        }
      : {}),
  };

  return (
    <article className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        // Escape "<" so the JSON can't break out of the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
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
      {firm.owner_id === null && (
        <div className="mt-6 flex items-center justify-end gap-2">
          <Link
            href={`/${citySlug}/firms/${firmSlug}/claim`}
            className={cn(buttonVariants({ variant: "outline-navy", size: "sm" }))}
          >
            Claim This Listing
          </Link>
          <PremiumUpgradeModal
            firmId={firm.id}
            claimHref={`/${citySlug}/firms/${firmSlug}/claim?premium=true`}
            triggerLabel="Go Premium →"
            triggerSize="sm"
          />
        </div>
      )}

      <nav className="mt-6 text-sm text-muted-foreground">
        <Link href={`/${citySlug}`} className="hover:text-foreground hover:underline">
          {citySlug.charAt(0).toUpperCase() + citySlug.slice(1)} firms
        </Link>{" "}
        / <span className="text-foreground">{firm.name}</span>
      </nav>

      <div
        className={
          hasLeftColumnContent
            ? "mt-6 grid gap-10 lg:grid-cols-[1fr_320px]"
            : "mt-6 grid gap-10 lg:mx-auto lg:max-w-md"
        }
      >
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
                <h1 className="font-heading text-3xl font-semibold tracking-tight">
                  {firm.name}
                </h1>
                {isPremium && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    Premium
                  </span>
                )}
                {firm.owner_id !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <BadgeCheck className="size-3" aria-hidden />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-lg font-medium text-muted-foreground">
                {tagline}
              </p>
              <div className="mt-1">
                <GoogleRatingBadge
                  rating={firm.google_rating}
                  reviewCount={firm.google_review_count}
                  googlePlaceId={firm.google_place_id}
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
            <section className="mt-10">
              <h2 className="text-lg font-semibold">About</h2>
              <p className="mt-3 max-w-2xl leading-7 text-foreground/90">
                {bio}
              </p>
            </section>
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
                {gallery.map((image, index) => (
                  <li
                    key={image.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border"
                  >
                    <ShimmerImage
                      src={image.image_url}
                      alt={`${firm.name} office photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Free-tier owner logo + bio editing: available to ANY claimed
              firm, not just premium — distinct from PremiumEditForm below,
              which premium owners already have (and which still owns
              practice areas + gallery, the fields that remain premium
              -only). Two independent forms under one section heading. */}
          {isOwner && !isPremium && (
            <section
              aria-labelledby="thumbnail-heading"
              className="mt-10 rounded-xl border border-border bg-card p-6"
            >
              <h2 id="thumbnail-heading" className="text-lg font-semibold">
                Listing photo & bio
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Upload a logo or photo, and write a longer bio, to show on
                your card and listing page.
              </p>
              <LogoUploadForm
                firmId={firm.id}
                firmName={firm.name}
                initialLogoUrl={firm.logo_url}
              />
              <BioEditForm firmId={firm.id} initialBioLong={firm.bio_long} />
            </section>
          )}

          {/* Owner upgrade CTA (T18): only the signed-in owner of a live,
              free-tier listing sees this. */}
          {isOwner && firm.tier === "free" && (
            <section
              aria-labelledby="upgrade-heading"
              className="mt-10 rounded-xl border border-border bg-card p-6"
            >
              <h2 id="upgrade-heading" className="text-lg font-semibold">
                Upgrade to Premium
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add a photo gallery, multiple practice areas, a longer bio,
                and a contact form on this page.
              </p>
              <div className="mt-4">
                <PremiumUpgradeModal firmId={firm.id} />
              </div>
            </section>
          )}

          {/* Owner edit entry point (T20): premium owners only. */}
          {isOwner && isPremium && (
            <section
              aria-labelledby="owner-heading"
              className="mt-10 rounded-xl border border-border bg-card p-6"
            >
              <h2 id="owner-heading" className="text-lg font-semibold">
                Your premium listing
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keep your logo, photos, practice areas, and bio up to date.
              </p>
              <Link
                href={`/${citySlug}/firms/${firmSlug}/edit`}
                className={buttonVariants({ className: "mt-4" })}
              >
                Edit premium profile
              </Link>
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
            {websiteUrl && (
              <li>
                <a
                  href={websiteUrl}
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

          {/* "Contact this firm" lead form (T21): premium only — delivery
              runs through HighLevel, not a direct email. */}
          {isPremium && (
            <>
              <h3 className="mt-5 text-sm font-semibold">
                Contact this firm
              </h3>
              <LeadForm firmId={firm.id} firmName={firm.name} />
            </>
          )}

          {firm.address && (
            <FirmMap address={firm.address} />
          )}
        </aside>
      </div>
    </article>
  );
}
