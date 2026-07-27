"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { bioEditSchema, type BioEditInput } from "@/lib/schemas/bio-edit";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground";
const errorClass = "mt-1 text-xs text-destructive";

// Lightweight long-bio editor — available to ANY claimed firm, free or
// premium (unlike PremiumEditForm's bio field, which is bundled with
// premium-only fields). Posts to /api/listings/[id]/bio, which has no tier
// gate.
export function BioEditForm({
  firmId,
  initialBioLong,
}: {
  firmId: string;
  initialBioLong: string | null;
}) {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<BioEditInput>({
    resolver: zodResolver(bioEditSchema),
    defaultValues: { bioLong: initialBioLong ?? "" },
  });

  async function onSubmit(values: BioEditInput) {
    setSaved(false);
    const res = await fetch(`/api/listings/${firmId}/bio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("root", {
        message: json.error ?? "Something went wrong — please try again.",
      });
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
      <label htmlFor="bioLong" className="mb-1 block text-sm font-medium">
        Long bio
      </label>
      <textarea
        id="bioLong"
        rows={6}
        placeholder="The full story of your firm — experience, approach, notable results. Shown on your listing page."
        className={inputClass}
        {...register("bioLong")}
      />
      {errors.bioLong && <p className={errorClass}>{errors.bioLong.message}</p>}
      {errors.root && <p className={errorClass}>{errors.root.message}</p>}
      {saved && (
        <p className="mt-1 text-xs text-muted-foreground">Saved.</p>
      )}
      <Button type="submit" size="sm" className="mt-3" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save bio"}
      </Button>
    </form>
  );
}
