import { createClient } from "@/lib/supabase/server";

const MAX_IDS = 50;

// /api/firms/lookup?ids=a,b,c — public read, used only by the signed-out
// /saved page to resolve localStorage-held firm IDs into displayable
// summaries (a Server Component can't read localStorage itself, so that
// path has to go through a client fetch). Same status='live' filter every
// public firm query uses (CLAUDE.md data model rule); ids is capped so a
// tampered query string can't force an unbounded IN() list.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return Response.json({ firms: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("firms")
    .select(
      `id, slug, name, tier, google_rating, google_review_count, google_place_id,
       cities(slug, name)`,
    )
    .in("id", ids)
    .eq("status", "live");
  if (error) {
    console.error("firms/lookup: query failed", error);
    return Response.json({ error: "Could not load firms" }, { status: 500 });
  }

  return Response.json({ firms: data ?? [] });
}
