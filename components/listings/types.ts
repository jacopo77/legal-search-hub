// Shared listing types. DB columns are snake_case; we map to camelCase at
// the query boundary (listing-section.tsx) per CLAUDE.md conventions.
export type ListingFirm = {
  id: string;
  slug: string;
  name: string;
  tier: "free" | "premium";
  phone: string | null;
  address: string | null;
  bioShort: string | null;
  logoUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googlePlaceId: string | null;
  ownerId: string | null;
  claimBadgeHidden: boolean;
  premiumBadge: boolean;
  practiceAreas: { slug: string; name: string }[];
};

// Raw PostgREST row shape for the firms query with the practice-area join.
// The Supabase client is untyped until `supabase gen types` lands (see TODO
// in lib/supabase/server.ts), so the query result is cast to this.
export type FirmRow = {
  id: string;
  slug: string;
  name: string;
  tier: "free" | "premium";
  phone: string | null;
  address: string | null;
  bio_short: string | null;
  logo_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_place_id: string | null;
  owner_id: string | null;
  claim_badge_hidden: boolean;
  premium_badge: boolean;
  firm_practice_areas: {
    practice_areas: { slug: string; name: string } | null;
  }[];
};

// Stable partition, not a sort: firms with a real image keep their
// existing relative order and come first as a block; firms without one
// keep their existing relative order and come after, as a block. Used to
// keep "All Firms" grids from visually alternating between real photos
// and the navy/gavel placeholder card.
export function partitionByImage(firms: ListingFirm[]): ListingFirm[] {
  const withImage: ListingFirm[] = [];
  const withoutImage: ListingFirm[] = [];
  for (const firm of firms) {
    (firm.logoUrl?.trim() ? withImage : withoutImage).push(firm);
  }
  return [...withImage, ...withoutImage];
}

export function mapFirmRow(row: FirmRow): ListingFirm {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tier: row.tier,
    phone: row.phone,
    address: row.address,
    bioShort: row.bio_short,
    logoUrl: row.logo_url,
    googleRating: row.google_rating,
    googleReviewCount: row.google_review_count,
    googlePlaceId: row.google_place_id,
    ownerId: row.owner_id,
    claimBadgeHidden: row.claim_badge_hidden,
    premiumBadge: row.premium_badge,
    practiceAreas: row.firm_practice_areas
      .map((link) => link.practice_areas)
      .filter((area) => area !== null),
  };
}
