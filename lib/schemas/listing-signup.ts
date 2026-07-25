import { z } from "zod";

// Shared schema for the "List Your Firm" signup (T14): the client form
// validates with it via react-hook-form, and POST /api/listings validates
// the same shape server-side (never trust client validation alone).
export const listingSignupSchema = z.object({
  firmName: z.string().trim().min(2).max(200),
  cityId: z.uuid(),
  practiceAreaId: z.uuid(),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(5).max(300),
  // z.url() validates syntax, not scheme — without the protocol allowlist
  // it accepts javascript: URLs (stored-XSS vector on the firm page).
  website: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]).optional(),
  bioShort: z.string().trim().min(10).max(500),
  // Owner account — magic link is sent to this email for brand-new owners.
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.email(),
  // Simplified hours inputs; the route expands these to the 7-day jsonb
  // shape firms.hours uses.
  hoursWeekday: z.string().trim().max(60).optional(),
  hoursSaturday: z.string().trim().max(60).optional(),
  hoursSunday: z.string().trim().max(60).optional(),
});

export type ListingSignupInput = z.infer<typeof listingSignupSchema>;
