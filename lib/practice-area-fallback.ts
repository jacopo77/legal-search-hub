// Manual mapping only, deliberately not a general similarity/tag-based
// system (UX review 2026-07-31, Feature Gap #6): reviewed against real
// inventory (2026-08), there is exactly one true zero-result category today
// (Divorce), so a curated map is lower-risk than an algorithm that could
// surface a tangentially-related category a user wouldn't consider a
// reasonable substitute. Revisit only if the category list grows enough
// that hand-maintaining this becomes a real burden.
//
// Only needs an entry for a category that's actually at zero (or
// near-zero) live inventory -- a category with real firms never reads this.
export const PRACTICE_AREA_FALLBACK: Record<string, string> = {
  divorce: "family-law",
};

export function getFallbackPracticeArea(slug: string): string | undefined {
  return PRACTICE_AREA_FALLBACK[slug];
}
