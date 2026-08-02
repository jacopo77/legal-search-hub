import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SavedFirmsLocalList } from "@/components/saved/saved-firms-local-list";
import { SavedFirmRow } from "@/components/saved/saved-firm-row";
import type { SavedFirmSummary } from "@/components/saved/types";

export const metadata: Metadata = {
  title: "Saved Firms — Legal Search Hub",
};

// /saved — works for both signed-in and signed-out visitors (Feature Gap
// #4), unlike /account: saves aren't gated behind an account in v1, they're
// just persisted differently depending on session state. Signed-in reads
// saved_firms directly (Server Component, same as every other data-driven
// page); signed-out defers to a client leaf that reads localStorage, since
// that's the one thing a Server Component can't do itself.
type SavedFirmRowFromDb = {
  firms: {
    id: string;
    slug: string;
    name: string;
    tier: "free" | "premium";
    google_rating: number | null;
    google_review_count: number | null;
    google_place_id: string | null;
    cities: { slug: string; name: string } | null;
  } | null;
};

export default async function SavedFirmsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let signedInFirms: SavedFirmSummary[] | null = null;
  if (user) {
    const { data } = await supabase
      .from("saved_firms")
      .select(
        `firms(id, slug, name, tier, google_rating, google_review_count,
         google_place_id, cities(slug, name))`,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    signedInFirms = ((data ?? []) as unknown as SavedFirmRowFromDb[])
      .map((row) => row.firms)
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .map((f) => ({
        id: f.id,
        slug: f.slug,
        name: f.name,
        tier: f.tier,
        googleRating: f.google_rating,
        googleReviewCount: f.google_review_count,
        googlePlaceId: f.google_place_id,
        citySlug: f.cities?.slug ?? null,
        cityName: f.cities?.name ?? null,
      }));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Saved Firms</h1>
      {!user && (
        <p className="mt-2 text-sm text-muted-foreground">
          Saved in this browser only. Sign in to keep your list on your
          account instead.
        </p>
      )}

      <div className="mt-6">
        {user ? (
          signedInFirms && signedInFirms.length > 0 ? (
            <ul className="space-y-3">
              {signedInFirms.map((firm) => (
                <SavedFirmRow key={firm.id} firm={firm} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
              <Heart className="size-8 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">
                You haven&apos;t saved any firms yet.
              </p>
            </div>
          )
        ) : (
          <SavedFirmsLocalList />
        )}
      </div>
    </div>
  );
}
