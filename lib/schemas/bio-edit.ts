import { z } from "zod";
import { bioLongSchema } from "@/lib/schemas/premium-edit";

// Free-tier bio-only edit (any claimed firm, not just premium). Reuses the
// exact same bio_long rule the premium edit form validates against, rather
// than duplicating the limit.
export const bioEditSchema = z.object({
  bioLong: bioLongSchema,
});

export type BioEditInput = z.infer<typeof bioEditSchema>;
