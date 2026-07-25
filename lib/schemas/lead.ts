import { z } from "zod";

// Shared schema for the "Contact this firm" lead form (T21): the client
// form validates with it, and POST /api/leads validates the same shape
// server-side (never trust client validation alone).
export const leadSchema = z.object({
  firmId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10).max(2000),
});

export type LeadInput = z.infer<typeof leadSchema>;
