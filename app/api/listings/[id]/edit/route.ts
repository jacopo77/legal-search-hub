import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { premiumEditSchema } from "@/lib/schemas/premium-edit";
import { env } from "@/lib/env";

// POST /api/listings/[id]/edit — premium profile editing (T20). Multipart
// form: bio_long, practice-area set, logo file, gallery add/remove.
//
// Auth: session user must own the firm and the firm must be premium — the
// edited fields are all premium-only. Ownership/premium checks happen here
// in application code; the writes then go through the service-role admin
// client, which both the guard triggers and (unknown-to-this-repo,
// dashboard-managed) Storage bucket policies exempt. Storage objects live
// under a per-firm path prefix, and gallery removal deletes the Storage
// object along with its row so removed photos don't linger in the bucket.

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const GALLERY_MAX_BYTES = 5 * 1024 * 1024;
const GALLERY_MAX_IMAGES = 12;

type EditFirmRow = {
  id: string;
  tier: "free" | "premium";
  owner_id: string | null;
};

function publicUrl(bucket: string, path: string): string {
  return `${env.supabase.url()}/storage/v1/object/public/${bucket}/${path}`;
}

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
    return Response.json({ error: "Sign in to edit this listing" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("firms")
    .select("id, tier, owner_id")
    .eq("id", id)
    .maybeSingle();
  const firm = data as unknown as EditFirmRow | null;
  if (!firm || firm.owner_id !== user.id) {
    return Response.json({ error: "Not your listing" }, { status: 403 });
  }
  if (firm.tier !== "premium") {
    return Response.json(
      { error: "These fields require a Premium listing" },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const parsed = premiumEditSchema.safeParse({
    bioLong: form.get("bioLong")?.toString() ?? "",
    practiceAreaIds: form.getAll("practiceAreaIds").map(String),
  });
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Verify the practice-area ids exist — never trust client-supplied ids.
  const { data: areas } = await admin
    .from("practice_areas")
    .select("id")
    .in("id", input.practiceAreaIds);
  if (!areas || areas.length !== input.practiceAreaIds.length) {
    return Response.json({ error: "Unknown practice area" }, { status: 400 });
  }

  // Scalar updates: bio + practice-area set.
  const { error: firmError } = await admin
    .from("firms")
    .update({ bio_long: input.bioLong || null })
    .eq("id", firm.id);
  if (firmError) {
    console.error("edit: bio update failed", firmError);
    return Response.json({ error: "Could not save — please try again" }, { status: 500 });
  }
  const { error: deleteAreasError } = await admin
    .from("firm_practice_areas")
    .delete()
    .eq("firm_id", firm.id);
  if (deleteAreasError) {
    console.error("edit: practice-area reset failed", deleteAreasError);
    return Response.json({ error: "Could not save — please try again" }, { status: 500 });
  }
  const { error: insertAreasError } = await admin
    .from("firm_practice_areas")
    .insert(
      input.practiceAreaIds.map((practice_area_id) => ({
        firm_id: firm.id,
        practice_area_id,
      })),
    );
  if (insertAreasError) {
    console.error("edit: practice-area insert failed", insertAreasError);
    return Response.json({ error: "Could not save — please try again" }, { status: 500 });
  }

  // Logo upload (optional; replaces the current one).
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const ext = IMAGE_TYPES[logo.type];
    if (!ext || logo.size > LOGO_MAX_BYTES) {
      return Response.json(
        { error: "Logo must be a JPEG, PNG, or WebP under 2 MB" },
        { status: 400 },
      );
    }
    const path = `${firm.id}/logo-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("firm-logos")
      .upload(path, logo, { contentType: logo.type });
    if (uploadError) {
      console.error("edit: logo upload failed", uploadError);
      return Response.json({ error: "Logo upload failed — other changes were saved" }, { status: 500 });
    }
    const { error: logoError } = await admin
      .from("firms")
      .update({ logo_url: publicUrl("firm-logos", path) })
      .eq("id", firm.id);
    if (logoError) console.error("edit: logo_url update failed", logoError);
  }

  // Gallery removals: delete the Storage object and its row together.
  const removeIds = form.getAll("removeGalleryIds").map(String).filter(Boolean);
  if (removeIds.length > 0) {
    const { data: removed } = await admin
      .from("firm_gallery_images")
      .delete()
      .eq("firm_id", firm.id)
      .in("id", removeIds)
      .select("image_url");
    const prefix = publicUrl("firm-gallery", "");
    const paths = (removed ?? [])
      .map((r) => (r.image_url as string).replace(prefix, ""))
      .filter(Boolean);
    if (paths.length > 0) {
      const { error: storageError } = await admin.storage
        .from("firm-gallery")
        .remove(paths);
      if (storageError) console.error("edit: gallery storage removal failed", storageError);
    }
  }

  // Gallery additions (optional), capped at GALLERY_MAX_IMAGES total.
  const galleryFiles = form
    .getAll("gallery")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (galleryFiles.length > 0) {
    const { count } = await admin
      .from("firm_gallery_images")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", firm.id);
    const remaining = GALLERY_MAX_IMAGES - (count ?? 0);
    if (galleryFiles.length > remaining) {
      return Response.json(
        { error: `Gallery allows ${GALLERY_MAX_IMAGES} photos total — remove some first` },
        { status: 400 },
      );
    }
    const { data: maxRow } = await admin
      .from("firm_gallery_images")
      .select("sort_order")
      .eq("firm_id", firm.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    let sortOrder = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;

    for (const file of galleryFiles) {
      const ext = IMAGE_TYPES[file.type];
      if (!ext || file.size > GALLERY_MAX_BYTES) {
        return Response.json(
          { error: "Gallery photos must be JPEG, PNG, or WebP under 5 MB each" },
          { status: 400 },
        );
      }
      const path = `${firm.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await admin.storage
        .from("firm-gallery")
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        console.error("edit: gallery upload failed", uploadError);
        return Response.json({ error: "A photo upload failed — other changes were saved" }, { status: 500 });
      }
      const { error: rowError } = await admin
        .from("firm_gallery_images")
        .insert({
          firm_id: firm.id,
          image_url: publicUrl("firm-gallery", path),
          sort_order: sortOrder++,
        });
      if (rowError) console.error("edit: gallery row insert failed", rowError);
    }
  }

  return Response.json({ ok: true });
}
