// Shared listing types. DB columns are snake_case; we map to camelCase at
// the query boundary (listing-section.tsx) per CLAUDE.md conventions.
export type ListingFirm = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  bioShort: string | null;
  logoUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  practiceAreas: { slug: string; name: string }[];
};

// Raw PostgREST row shape for the firms query with the practice-area join.
// The Supabase client is untyped until `supabase gen types` lands (see TODO
// in lib/supabase/server.ts), so the query result is cast to this.
export type FirmRow = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  bio_short: string | null;
  logo_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  firm_practice_areas: {
    practice_areas: { slug: string; name: string } | null;
  }[];
};

export function mapFirmRow(row: FirmRow): ListingFirm {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    phone: row.phone,
    address: row.address,
    bioShort: row.bio_short,
    logoUrl: row.logo_url,
    googleRating: row.google_rating,
    googleReviewCount: row.google_review_count,
    practiceAreas: row.firm_practice_areas
      .map((link) => link.practice_areas)
      .filter((area) => area !== null),
  };
}
