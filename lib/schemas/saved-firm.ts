import { z } from "zod";

// Shared schema for the save/unsave toggle: the client store validates
// nothing client-side (it's a plain fetch, not a form), but POST/DELETE
// /api/saved-firms validate this same shape server-side.
export const savedFirmSchema = z.object({
  firmId: z.uuid(),
});

export type SavedFirmInput = z.infer<typeof savedFirmSchema>;
