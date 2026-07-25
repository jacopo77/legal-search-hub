import { env } from "@/lib/env";

// Google Places integration (ARCHITECTURE.md §7): fetch a firm's rating +
// review count and cache them on the firms row. Never called per page view —
// only from the cron route (app/api/cron/google-ratings).
//
// SERVER-ONLY: uses the secret API key. Never import from a Client
// Component (same rule as lib/highlevel.ts / lib/stripe.ts).
//
// How firms.google_place_id gets set (manual, no auto-matching in v1 —
// avoids mismatching a firm to the wrong Place):
//   1. Find the firm on Google Maps, open its listing, and copy the Place ID
//      (Share → or use Google's Place ID finder:
//      https://developers.google.com/maps/documentation/places/web-service/place-id#find-id)
//   2. Set it on the row: in firms.json at seed time (google_place_id key),
//      or later by an admin via SQL/dashboard:
//      update firms set google_place_id = 'ChIJ...' where slug = '...';
//   The next cron run picks it up (oldest google_rating_synced_at first).

export type PlaceRating = {
  rating: number | null;
  reviewCount: number | null;
};

// Places API (New): field mask is required — we request exactly the two
// fields we cache and nothing more (billed per field).
export async function fetchPlaceRating(placeId: string): Promise<PlaceRating> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": env.googlePlaces.apiKey(),
        "X-Goog-FieldMask": "rating,userRatingCount",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Places API ${res.status} for ${placeId}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
  };
  return {
    rating: data.rating ?? null,
    reviewCount: data.userRatingCount ?? null,
  };
}
