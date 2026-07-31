import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { replaceFirmLogo, clearFirmLogo } from "@/lib/firms/logo-upload";

// POST/DELETE /api/listings/[id]/logo — thumbnail/logo upload+removal for
// ANY claimed firm, free or premium. Deliberately has no tier gate: the
// card thumbnail is a base listing feature, distinct from the premium-only
// gallery/bio/multi-practice-area fields in /api/listings/[id]/edit (T20).
// Shares the same upload/removal/cleanup logic as that route via
// lib/firms/logo-upload.ts.
type LogoFirmRow = {
  id: string;
  owner_id: string | null;
  logo_url: string | null;
};

// Shared by POST and DELETE: confirms the caller is signed in and owns the
// firm before either mutates logo_url. Returns either the owned firm row or
// a Response to return as-is.
async function loadOwnedLogoFirm(
  admin: SupabaseClient,
  id: string,
): Promise<{ firm: LogoFirmRow } | { error: Response }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: Response.json(
        { error: "Sign in to edit this listing" },
        { status: 401 },
      ),
    };
  }

  const { data } = await admin
    .from("firms")
    .select("id, owner_id, logo_url")
    .eq("id", id)
    .maybeSingle();
  const firm = data as unknown as LogoFirmRow | null;
  if (!firm || firm.owner_id !== user.id) {
    return { error: Response.json({ error: "Not your listing" }, { status: 403 }) };
  }

  return { firm };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createAdminClient();
  const owned = await loadOwnedLogoFirm(admin, id);
  if ("error" in owned) return owned.error;

  const form = await request.formData();
  const logo = form.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return Response.json({ error: "Choose an image to upload" }, { status: 400 });
  }

  const result = await replaceFirmLogo(admin, owned.firm, logo);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ ok: true, logoUrl: result.logoUrl });
}

// "Remove Image" — clears logo_url so the card falls back to the
// navy/gavel placeholder. No-op success if there was nothing to remove.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createAdminClient();
  const owned = await loadOwnedLogoFirm(admin, id);
  if ("error" in owned) return owned.error;

  const result = await clearFirmLogo(admin, owned.firm);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ ok: true });
}
