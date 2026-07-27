"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changeRequestSchema,
  type ChangeRequestInput,
} from "@/lib/schemas/change-request";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground";
const labelClass = "mb-1 block text-sm font-medium";
const errorClass = "mt-1 text-xs text-destructive";

// Claim / suggest-an-edit form (T17). Mounts inside the claim section of an
// unclaimed firm's detail page. Client component — local form state only;
// the firm id/name arrive as plain data from the server component.
export function ClaimRequestForm({
  firmId,
  firmName,
  initialMessage,
}: {
  firmId: string;
  firmName: string;
  // Pre-fills the message field — used by the "Go Premium" claim entry
  // point to record premium interest alongside the claim itself, since the
  // actual upgrade can't happen until an admin approves the claim.
  initialMessage?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  // Local mirror of the type field for conditional copy — watch() isn't
  // memoizable under the React Compiler lint rule.
  const [requestType, setRequestType] = useState<"claim" | "edit">("claim");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ChangeRequestInput>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: { type: "claim", message: initialMessage ?? "" },
  });
  const typeField = register("type");

  async function onSubmit(values: ChangeRequestInput) {
    const res = await fetch(`/api/listings/${firmId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("root", {
        message: body.error ?? "Something went wrong — please try again.",
      });
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
        Request received — our team reviews every{" "}
        {requestType === "claim" ? "claim" : "edit"} before anything changes
        on the {firmName} listing. We&apos;ll follow up at the email you
        provided.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
      <div>
        <label htmlFor="type" className={labelClass}>
          I want to…
        </label>
        <select
          id="type"
          className={inputClass}
          {...typeField}
          onChange={(e) => {
            typeField.onChange(e);
            setRequestType(e.target.value as "claim" | "edit");
          }}
        >
          <option value="claim">Claim this listing — it&apos;s my firm</option>
          <option value="edit">Suggest an edit to the info shown</option>
        </select>
        {errors.type && <p className={errorClass}>{errors.type.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="requesterName" className={labelClass}>
            Your name
          </label>
          <input
            id="requesterName"
            autoComplete="name"
            className={inputClass}
            {...register("requesterName")}
          />
          {errors.requesterName && (
            <p className={errorClass}>{errors.requesterName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="requesterEmail" className={labelClass}>
            Your email
          </label>
          <input
            id="requesterEmail"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register("requesterEmail")}
          />
          {errors.requesterEmail && (
            <p className={errorClass}>{errors.requesterEmail.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="requesterPhone" className={labelClass}>
          Your phone{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="requesterPhone"
          type="tel"
          autoComplete="tel"
          className={inputClass}
          {...register("requesterPhone")}
        />
        {errors.requesterPhone && (
          <p className={errorClass}>{errors.requesterPhone.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          {requestType === "claim"
            ? "How can we confirm it's your firm?"
            : "What should change?"}
        </label>
        <textarea
          id="message"
          rows={3}
          placeholder={
            requestType === "claim"
              ? "e.g. your role at the firm and a firm-domain email we can reach you at"
              : "Describe the correction — e.g. new phone number, updated address"
          }
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Sending…"
          : requestType === "claim"
            ? "Submit claim"
            : "Suggest edit"}
      </Button>
    </form>
  );
}
