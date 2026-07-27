import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bioEditSchema } from "@/lib/schemas/bio-edit";

// POST /api/listings/[id]/bio — long-bio editing for ANY claimed firm, free
// or premium. Deliberately has no tier gate: content depth isn't a premium
// feature anymore, only the gallery/multi-practice-area fields in
// /api/listings/[id]/edit (T20) still are. Shares the bio_long validation
// rule with that route via lib/schemas/premium-edit.ts's bioLongSchema.
type BioFirmRow = { id: string; owner_id: string | null };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to edit this listing" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("firms")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();
  const firm = data as unknown as BioFirmRow | null;
  if (!firm || firm.owner_id !== user.id) {
    return Response.json({ error: "Not your listing" }, { status: 403 });
  }

  const parsed = bioEditSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }

  const { error } = await admin
    .from("firms")
    .update({ bio_long: parsed.data.bioLong || null })
    .eq("id", firm.id);
  if (error) {
    console.error("bio: update failed", error);
    return Response.json(
      { error: "Could not save — please try again" },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
