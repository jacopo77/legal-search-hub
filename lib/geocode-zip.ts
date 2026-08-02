import { env } from "@/lib/env";

// Server-only: geocodes a user-entered ZIP for the All Firms location
// filter (app/[city]/firms/page.tsx). Never import from a Client Component
// -- uses the same server-side GOOGLE_PLACES_API_KEY as
// scripts/geocode-firms.js and scripts/match-google-places.js, not the
// public embed key.
export async function geocodeZip(
  zip: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&components=country:US&key=${env.googlePlaces.apiKey()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "OK" || !json.results?.[0]) return null;
    const { lat, lng } = json.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  } catch (err) {
    console.error("geocodeZip: request failed", err);
    return null;
  }
}
