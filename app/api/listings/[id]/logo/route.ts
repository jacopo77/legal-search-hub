import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { replaceFirmLogo } from "@/lib/firms/logo-upload";

// POST /api/listings/[id]/logo — thumbnail/logo upload for ANY claimed
// firm, free or premium. Deliberately has no tier gate: the card thumbnail
// is a base listing feature, distinct from the premium-only gallery/bio/
// multi-practice-area fields in /api/listings/[id]/edit (T20). Shares the
// same upload/validation/cleanup logic as that route via
// lib/firms/logo-upload.ts.
type LogoFirmRow = {
  id: string;
  owner_id: string | null;
  logo_url: string | null;
};

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
    .select("id, owner_id, logo_url")
    .eq("id", id)
    .maybeSingle();
  const firm = data as unknown as LogoFirmRow | null;
  if (!firm || firm.owner_id !== user.id) {
    return Response.json({ error: "Not your listing" }, { status: 403 });
  }

  const form = await request.formData();
  const logo = form.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return Response.json({ error: "Choose an image to upload" }, { status: 400 });
  }

  const result = await replaceFirmLogo(admin, firm, logo);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ ok: true, logoUrl: result.logoUrl });
}
