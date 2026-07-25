import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { fetchPlaceRating } from "@/lib/google-places";

// Internal cron route (T13): refresh cached Google rating/review counts for
// firms with a google_place_id. Triggered by Vercel Cron (see vercel.json,
// daily) — never by public traffic: the Authorization header must match
// CRON_SECRET. Vercel sends `Authorization: Bearer <CRON_SECRET>`
// automatically when CRON_SECRET is set in the project env.
//
// Bounded batch: firms refresh oldest-first, BATCH_SIZE per run, so a huge
// directory can't blow the function timeout or the Places quota in one go.
const BATCH_SIZE = 50;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.cron.secret()}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: firms, error } = await supabase
    .from("firms")
    .select("id, slug, google_place_id")
    .not("google_place_id", "is", null)
    .order("google_rating_synced_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("google-ratings cron: firms query failed", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  const failed: { slug: string; error: string }[] = [];

  // Sequential on purpose: a cron batch doesn't need parallelism, and
  // one bad Place ID must not abort the rest of the batch.
  for (const firm of firms ?? []) {
    try {
      const { rating, reviewCount } = await fetchPlaceRating(
        firm.google_place_id as string,
      );
      const { error: updateError } = await supabase
        .from("firms")
        .update({
          google_rating: rating,
          google_review_count: reviewCount,
          google_rating_synced_at: new Date().toISOString(),
        })
        .eq("id", firm.id);
      if (updateError) throw new Error(updateError.message);
      updated++;
    } catch (err) {
      console.error(`google-ratings cron: ${firm.slug} failed`, err);
      failed.push({
        slug: firm.slug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({ scanned: firms?.length ?? 0, updated, failed });
}
