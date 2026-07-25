import { z } from "zod";

// Shared schema for the premium profile edit form (T20): the client form
// validates with it, and POST /api/listings/[id]/edit validates the same
// shape server-side. File inputs (logo/gallery) travel in the same
// FormData but are validated manually in the route — zod doesn't parse
// File objects portably across runtimes.
export const premiumEditSchema = z.object({
  // Long bio is premium-only (ARCHITECTURE.md §4.4). Empty string clears it.
  bioLong: z.string().trim().max(5000),
  // Premium = multiple practice areas; at least one is required (application
  // -level rule, not a DB constraint — same convention as the free tier's
  // single-area limit).
  practiceAreaIds: z.array(z.uuid()).min(1, "Pick at least one practice area"),
});

export type PremiumEditInput = z.infer<typeof premiumEditSchema>;
