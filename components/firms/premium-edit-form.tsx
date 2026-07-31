"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  premiumEditSchema,
  type PremiumEditInput,
} from "@/lib/schemas/premium-edit";
import { Button } from "@/components/ui/button";
import { LogoImageManager } from "@/components/firms/logo-image-manager";
import { notifyError, notifySuccess } from "@/lib/toast";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground";
const labelClass = "mb-1 block text-sm font-medium";
const errorClass = "mt-1 text-xs text-destructive";

export type EditPracticeArea = { id: string; name: string };
export type EditGalleryImage = { id: string; imageUrl: string };

// Form values = the zod-validated scalars plus the file/checkbox inputs the
// schema deliberately doesn't cover (files are validated in the route).
type FormValues = PremiumEditInput & {
  logo?: FileList | null;
  gallery?: FileList | null;
  removeGalleryIds?: string[];
};

// Premium profile edit form (T20). Posts one multipart FormData to
// /api/listings/[id]/edit — scalars validated with the shared zod schema,
// files appended from their inputs.
export function PremiumEditForm({
  firmId,
  firmName,
  firmPath,
  initialBioLong,
  initialLogoUrl,
  practiceAreas,
  selectedAreaIds,
  gallery,
}: {
  firmId: string;
  firmName: string;
  // e.g. /phoenix/firms/acme-law — for the "view listing" link.
  firmPath: string;
  initialBioLong: string | null;
  initialLogoUrl: string | null;
  practiceAreas: EditPracticeArea[];
  selectedAreaIds: string[];
  gallery: EditGalleryImage[];
}) {
  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [removingLogo, setRemovingLogo] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    // The resolver only validates the scalar subset of FormValues — cast
    // keeps the file fields out of zod's way (they're checked server-side).
    resolver: zodResolver(premiumEditSchema) as Resolver<FormValues>,
    defaultValues: {
      bioLong: initialBioLong ?? "",
      practiceAreaIds: selectedAreaIds,
      removeGalleryIds: [],
    },
  });

  async function onSubmit(values: FormValues) {
    const body = new FormData();
    body.set("bioLong", values.bioLong);
    for (const areaId of values.practiceAreaIds) {
      body.append("practiceAreaIds", areaId);
    }
    for (const removeId of values.removeGalleryIds ?? []) {
      body.append("removeGalleryIds", removeId);
    }
    const logo = values.logo?.[0];
    if (logo) body.set("logo", logo);
    for (const file of Array.from(values.gallery ?? [])) {
      body.append("gallery", file);
    }

    const res = await fetch(`/api/listings/${firmId}/edit`, {
      method: "POST",
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json.error ?? "Something went wrong — please try again.";
      setError("root", { message });
      notifyError(message);
      return;
    }
    setSaved(true);
  }

  // Immediate, standalone action — not bundled into the big multipart
  // submit above — so confirming removal can't be silently lost if the
  // owner later cancels an unrelated edit on this same form.
  async function handleRemoveLogo() {
    setRemovingLogo(true);
    const res = await fetch(`/api/listings/${firmId}/logo`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setRemovingLogo(false);
    if (!res.ok) {
      notifyError(json.error ?? "Something went wrong — please try again.", "Remove failed");
      return;
    }
    setLogoUrl(null);
    notifySuccess("Your logo was removed.", "Logo removed");
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">Profile updated</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your changes are live on your listing.
        </p>
        <Link
          href={firmPath}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          View your listing →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section aria-labelledby="logo-heading">
        <h2 id="logo-heading" className={labelClass}>
          Logo
        </h2>
        <LogoImageManager
          firmName={firmName}
          logoUrl={logoUrl}
          registerLogoInput={register("logo")}
          onCancelSelection={() => resetField("logo")}
          onRemove={handleRemoveLogo}
          removing={removingLogo}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          A newly selected image is uploaded when you click &quot;Save
          changes&quot; below.
        </p>
      </section>

      <fieldset>
        <legend className={labelClass}>Practice areas</legend>
        <p className="mb-2 text-xs text-muted-foreground">
          Premium listings can show multiple practice areas.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {practiceAreas.map((area) => (
            <label
              key={area.id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5"
            >
              <input
                type="checkbox"
                value={area.id}
                className="size-4 accent-primary"
                {...register("practiceAreaIds")}
              />
              {area.name}
            </label>
          ))}
        </div>
        {errors.practiceAreaIds && (
          <p className={errorClass}>{errors.practiceAreaIds.message}</p>
        )}
      </fieldset>

      <div>
        <label htmlFor="bioLong" className={labelClass}>
          Long bio
        </label>
        <textarea
          id="bioLong"
          rows={8}
          placeholder="The full story of your firm — experience, approach, notable results. Shown on your listing page."
          className={inputClass}
          {...register("bioLong")}
        />
        {errors.bioLong && (
          <p className={errorClass}>{errors.bioLong.message}</p>
        )}
      </div>

      <section aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className={labelClass}>
          Photo gallery
        </h2>
        {gallery.length > 0 && (
          <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((image) => (
              <li key={image.id} className="space-y-1">
                <span className="relative block aspect-[4/3] overflow-hidden rounded-lg border border-border">
                  <Image
                    src={image.imageUrl}
                    alt="Gallery photo"
                    fill
                    className="object-cover"
                  />
                </span>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    value={image.id}
                    className="size-3.5 accent-destructive"
                    {...register("removeGalleryIds")}
                  />
                  Remove
                </label>
              </li>
            ))}
          </ul>
        )}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted"
          {...register("gallery")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, or WebP, under 5 MB each, up to 12 photos total.
        </p>
      </section>

      {errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
