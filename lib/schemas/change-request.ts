import { z } from "zod";

// Shared schema for claim/edit requests (T17): the client form validates
// with it via react-hook-form, and POST /api/listings/[id]/claim validates
// the same shape server-side (never trust client validation alone).
export const changeRequestSchema = z.object({
  type: z.enum(["claim", "edit"]),
  requesterName: z.string().trim().min(2).max(120),
  requesterEmail: z.email(),
  requesterPhone: z.string().trim().max(30).optional(),
  // For a claim: anything that helps the admin confirm ownership. For an
  // edit: what should change. Free-form per ARCHITECTURE.md §4.7.
  message: z.string().trim().min(10).max(2000),
});

export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;
