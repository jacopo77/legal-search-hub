"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { leadSchema, type LeadInput } from "@/lib/schemas/lead";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/lib/toast";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground";
const labelClass = "mb-1 block text-sm font-medium";
const errorClass = "mt-1 text-xs text-destructive";

// "Contact this firm" lead form (T21). Mounts in the contact aside of
// premium firm detail pages. Client component — local form state only;
// the firm id/name arrive as plain data from the server component.
export function LeadForm({
  firmId,
  firmName,
}: {
  firmId: string;
  firmName: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { firmId },
  });

  async function onSubmit(values: LeadInput) {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = body.error ?? "Something went wrong — please try again.";
      setError("root", { message });
      notifyError(message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="mt-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground">
        Message sent — {firmName} will follow up with you directly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
      <input type="hidden" {...register("firmId")} />
      <div>
        <label htmlFor="lead-name" className={labelClass}>
          Your name
        </label>
        <input
          id="lead-name"
          autoComplete="name"
          className={inputClass}
          {...register("name")}
        />
        {errors.name && <p className={errorClass}>{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="lead-email" className={labelClass}>
          Your email
        </label>
        <input
          id="lead-email"
          type="email"
          autoComplete="email"
          className={inputClass}
          {...register("email")}
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="lead-phone" className={labelClass}>
          Your phone{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="lead-phone"
          type="tel"
          autoComplete="tel"
          className={inputClass}
          {...register("phone")}
        />
        {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
      </div>
      <div>
        <label htmlFor="lead-message" className={labelClass}>
          How can they help?
        </label>
        <textarea
          id="lead-message"
          rows={3}
          placeholder="Briefly describe your situation"
          className={inputClass}
          {...register("message")}
        />
        {errors.message && (
          <p className={errorClass}>{errors.message.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : `Contact ${firmName}`}
      </Button>
    </form>
  );
}
