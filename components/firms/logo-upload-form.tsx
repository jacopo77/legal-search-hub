"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { LogoImageManager } from "@/components/firms/logo-image-manager";
import { notifyError, notifySuccess } from "@/lib/toast";

type FormValues = { logo: FileList };

// Lightweight thumbnail/logo upload — available to ANY claimed firm, free
// or premium (unlike PremiumEditForm's logo section, which is bundled with
// premium-only fields). Posts to /api/listings/[id]/logo, which has no
// tier gate. Visual chrome (current-image preview, replace, remove) lives
// in LogoImageManager, shared with PremiumEditForm; upload/remove requests
// and their success/error toasts stay here.
export function LogoUploadForm({
  firmId,
  firmName,
  initialLogoUrl,
}: {
  firmId: string;
  firmName: string;
  initialLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [removing, setRemoving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    resetField,
    formState: { isSubmitting, errors },
    setError,
  } = useForm<FormValues>();

  async function onSubmit(values: FormValues) {
    const file = values.logo?.[0];
    if (!file) return;

    const body = new FormData();
    body.set("logo", file);
    const res = await fetch(`/api/listings/${firmId}/logo`, {
      method: "POST",
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json.error ?? "Something went wrong — please try again.";
      setError("root", { message });
      notifyError(message, "Upload failed");
      return;
    }
    setLogoUrl(json.logoUrl);
    reset();
    notifySuccess("Your listing photo is live.", "Logo updated");
  }

  async function handleRemove() {
    setRemoving(true);
    const res = await fetch(`/api/listings/${firmId}/logo`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setRemoving(false);
    if (!res.ok) {
      notifyError(json.error ?? "Something went wrong — please try again.", "Remove failed");
      return;
    }
    setLogoUrl(null);
    notifySuccess("Your listing photo was removed.", "Logo removed");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
      <LogoImageManager
        firmName={firmName}
        logoUrl={logoUrl}
        registerLogoInput={register("logo", { required: true })}
        onCancelSelection={() => resetField("logo")}
        onRemove={handleRemove}
        removing={removing}
      />
      {errors.root && (
        <p className="mt-2 text-xs text-destructive">{errors.root.message}</p>
      )}
      <Button type="submit" size="sm" className="mt-3" disabled={isSubmitting}>
        {isSubmitting ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
