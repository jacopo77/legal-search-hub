import { z } from "zod";

// Long bio's validation rule, shared between the premium edit form (below)
// and the free-tier bio-only edit form (lib/schemas/bio-edit.ts) — bio_long
// is available to any claimed firm now, only gallery/multi-practice-area
// stay premium-gated. Empty string clears it.
export const bioLongSchema = z.string().trim().max(5000);

// Shared schema for the premium profile edit form (T20): the client form
// validates with it, and POST /api/listings/[id]/edit validates the same
// shape server-side. File inputs (logo/gallery) travel in the same
// FormData but are validated manually in the route — zod doesn't parse
// File objects portably across runtimes.
export const premiumEditSchema = z.object({
  bioLong: bioLongSchema,
  // Premium = multiple practice areas; at least one is required (application
  // -level rule, not a DB constraint — same convention as the free tier's
  // single-area limit).
  practiceAreaIds: z.array(z.uuid()).min(1, "Pick at least one practice area"),
});

export type PremiumEditInput = z.infer<typeof premiumEditSchema>;
