"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";

type FormValues = { logo: FileList };

// Lightweight thumbnail/logo upload — available to ANY claimed firm, free
// or premium (unlike PremiumEditForm's logo section, which is bundled with
// premium-only fields). Posts to /api/listings/[id]/logo, which has no
// tier gate.
export function LogoUploadForm({
  firmId,
  initialLogoUrl,
}: {
  firmId: string;
  initialLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const {
    register,
    handleSubmit,
    reset,
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
      setError("root", {
        message: json.error ?? "Something went wrong — please try again.",
      });
      return;
    }
    setLogoUrl(json.logoUrl);
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 flex items-center gap-4"
    >
      {logoUrl && (
        <Image
          src={logoUrl}
          alt="Current listing photo"
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-lg border border-border object-contain"
        />
      )}
      <div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted"
          {...register("logo", { required: true })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, or WebP, under 2 MB.
        </p>
        {errors.root && (
          <p className="mt-1 text-xs text-destructive">
            {errors.root.message}
          </p>
        )}
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
