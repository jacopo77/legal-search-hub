import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Shared logo upload logic — used by both the premium edit route (T20) and
// the free-tier logo-only route. Logo is not a premium-gated feature (only
// the gallery/bio/multi-practice-area fields are); this stays in one place
// so both routes validate/store/clean up identically.

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

// Magic-byte sniffing: file.type is attacker-supplied, so the allowlist is
// enforced against the actual bytes. Returns the extension to use, or null.
export async function sniffImageExtension(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "png";
  if (
    b[0] === 0x52 && // R
    b[1] === 0x49 && // I
    b[2] === 0x46 && // F
    b[3] === 0x46 && // F
    b[8] === 0x57 && // W
    b[9] === 0x45 && // E
    b[10] === 0x42 && // B
    b[11] === 0x50 // P
  )
    return "webp";
  return null;
}

export function publicUrl(bucket: string, path: string): string {
  return `${env.supabase.url()}/storage/v1/object/public/${bucket}/${path}`;
}

export type LogoUploadResult =
  | { ok: true; logoUrl: string }
  | { ok: false; error: string; status: number };

export type LogoClearResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

// Best-effort cleanup of a firm-logos object, shared by replace and clear —
// only removes URLs we recognize as our own bucket, never a foreign/legacy
// value that happens to be stored in logo_url.
async function removeStoredLogoIfOwned(
  admin: SupabaseClient,
  logoUrl: string | null,
): Promise<void> {
  const prefix = publicUrl("firm-logos", "");
  if (!logoUrl?.startsWith(prefix)) return;
  const { error } = await admin.storage
    .from("firm-logos")
    .remove([logoUrl.slice(prefix.length)]);
  if (error) {
    console.error("removeStoredLogoIfOwned: removal failed", error);
  }
}

// Validates, uploads to the firm-logos bucket, updates firms.logo_url, and
// best-effort removes the object it replaced.
export async function replaceFirmLogo(
  admin: SupabaseClient,
  firm: { id: string; logo_url: string | null },
  file: File,
): Promise<LogoUploadResult> {
  const ext = await sniffImageExtension(file);
  if (!ext || file.size > LOGO_MAX_BYTES) {
    return {
      ok: false,
      error: "Logo must be a JPEG, PNG, or WebP under 2 MB",
      status: 400,
    };
  }

  const path = `${firm.id}/logo-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("firm-logos")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    console.error("replaceFirmLogo: upload failed", uploadError);
    return { ok: false, error: "Logo upload failed", status: 500 };
  }

  const logoUrl = publicUrl("firm-logos", path);
  const { error: logoError } = await admin
    .from("firms")
    .update({ logo_url: logoUrl })
    .eq("id", firm.id);
  if (logoError) {
    console.error("replaceFirmLogo: logo_url update failed", logoError);
    return {
      ok: false,
      error: "Could not save logo — please try again",
      status: 500,
    };
  }

  await removeStoredLogoIfOwned(admin, firm.logo_url);

  return { ok: true, logoUrl };
}

// Clears logo_url and best-effort removes the Storage object — the
// "Remove Image" action (image-manager UI). Firm falls back to the
// navy/gavel FirmLogoPlaceholder on cards once logo_url is null.
export async function clearFirmLogo(
  admin: SupabaseClient,
  firm: { id: string; logo_url: string | null },
): Promise<LogoClearResult> {
  const { error } = await admin
    .from("firms")
    .update({ logo_url: null })
    .eq("id", firm.id);
  if (error) {
    console.error("clearFirmLogo: logo_url update failed", error);
    return {
      ok: false,
      error: "Could not remove logo — please try again",
      status: 500,
    };
  }

  await removeStoredLogoIfOwned(admin, firm.logo_url);

  return { ok: true };
}
