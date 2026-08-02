"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useSavedFirmIds } from "@/lib/saved-firms";
import { SavedFirmRow } from "./saved-firm-row";
import type { SavedFirmSummary } from "./types";

type LookupFirmRow = {
  id: string;
  slug: string;
  name: string;
  tier: "free" | "premium";
  google_rating: number | null;
  google_review_count: number | null;
  google_place_id: string | null;
  cities: { slug: string; name: string } | null;
};

// Signed-out branch of /saved: a Server Component can't read localStorage,
// so this client leaf reads the shared saved-ids store (lib/saved-firms.ts)
// and resolves them to displayable summaries via the one public lookup
// endpoint that exists for exactly this purpose.
export function SavedFirmsLocalList() {
  const { ids, loaded, signedIn } = useSavedFirmIds();
  const [firms, setFirms] = useState<SavedFirmSummary[] | null>(null);

  useEffect(() => {
    if (!loaded || signedIn || ids.size === 0) return;
    let cancelled = false;
    fetch(`/api/firms/lookup?ids=${[...ids].join(",")}`)
      .then((res) => res.json())
      .then((json: { firms?: LookupFirmRow[] }) => {
        if (cancelled) return;
        setFirms(
          (json.firms ?? []).map((f) => ({
            id: f.id,
            slug: f.slug,
            name: f.name,
            tier: f.tier,
            googleRating: f.google_rating,
            googleReviewCount: f.google_review_count,
            googlePlaceId: f.google_place_id,
            citySlug: f.cities?.slug ?? null,
            cityName: f.cities?.name ?? null,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setFirms([]);
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, signedIn, ids]);

  const stillFetching = !loaded || (ids.size > 0 && firms === null);
  if (stillFetching) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (ids.size === 0 || firms === null || firms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
        <Heart className="size-8 text-muted-foreground/60" aria-hidden />
        <p className="text-sm text-muted-foreground">
          You haven&apos;t saved any firms yet.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {firms.map((firm) => (
        <SavedFirmRow key={firm.id} firm={firm} />
      ))}
    </ul>
  );
}
