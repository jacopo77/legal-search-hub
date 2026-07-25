"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  listingSignupSchema,
  type ListingSignupInput,
} from "@/lib/schemas/listing-signup";
import { Button } from "@/components/ui/button";

export type SignupOption = { id: string; name: string };

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground";
const labelClass = "mb-1 block text-sm font-medium";
const errorClass = "mt-1 text-xs text-destructive";

// "List Your Firm" free signup form (T14). Client component — local form
// state only; the cities/practice-area options arrive as plain data from
// the server page.
export function SignupForm({
  cities,
  practiceAreas,
}: {
  cities: SignupOption[];
  practiceAreas: SignupOption[];
}) {
  const [submitted, setSubmitted] = useState<{
    magicLinkSent: boolean;
  } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ListingSignupInput>({
    resolver: zodResolver(listingSignupSchema),
  });

  async function onSubmit(values: ListingSignupInput) {
    const res = await fetch("/api/listings", {
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
    setSubmitted({ magicLinkSent: Boolean(body.magicLinkSent) });
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">Listing submitted</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Our team reviews every new listing before it goes live — you&apos;ll
          hear from us soon.
          {submitted.magicLinkSent &&
            " We've also emailed you a magic sign-in link so you can manage your listing once it's approved."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="firmName" className={labelClass}>
          Firm name
        </label>
        <input id="firmName" className={inputClass} {...register("firmName")} />
        {errors.firmName && (
          <p className={errorClass}>{errors.firmName.message}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cityId" className={labelClass}>
            City
          </label>
          <select id="cityId" className={inputClass} {...register("cityId")}>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          {errors.cityId && (
            <p className={errorClass}>{errors.cityId.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="practiceAreaId" className={labelClass}>
            Primary practice area
          </label>
          <select
            id="practiceAreaId"
            className={inputClass}
            {...register("practiceAreaId")}
          >
            {practiceAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Free listings include one practice area; premium unlocks more.
          </p>
          {errors.practiceAreaId && (
            <p className={errorClass}>{errors.practiceAreaId.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            className={inputClass}
            {...register("phone")}
          />
          {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
        </div>
        <div>
          <label htmlFor="website" className={labelClass}>
            Website <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="website"
            type="url"
            placeholder="https://"
            className={inputClass}
            {...register("website")}
          />
          {errors.website && (
            <p className={errorClass}>{errors.website.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          Office address
        </label>
        <input id="address" className={inputClass} {...register("address")} />
        {errors.address && (
          <p className={errorClass}>{errors.address.message}</p>
        )}
      </div>

      <fieldset>
        <legend className={labelClass}>
          Hours <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            aria-label="Weekday hours"
            placeholder="Mon–Fri, e.g. 9:00 AM–5:00 PM"
            className={inputClass}
            {...register("hoursWeekday")}
          />
          <input
            aria-label="Saturday hours"
            placeholder="Saturday"
            className={inputClass}
            {...register("hoursSaturday")}
          />
          <input
            aria-label="Sunday hours"
            placeholder="Sunday"
            className={inputClass}
            {...register("hoursSunday")}
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="bioShort" className={labelClass}>
          Short bio
        </label>
        <textarea
          id="bioShort"
          rows={3}
          placeholder="One to two sentences about your firm, shown on your listing card."
          className={inputClass}
          {...register("bioShort")}
        />
        {errors.bioShort && (
          <p className={errorClass}>{errors.bioShort.message}</p>
        )}
      </div>

      <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ownerName" className={labelClass}>
            Your name
          </label>
          <input
            id="ownerName"
            autoComplete="name"
            className={inputClass}
            {...register("ownerName")}
          />
          {errors.ownerName && (
            <p className={errorClass}>{errors.ownerName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="ownerEmail" className={labelClass}>
            Your email
          </label>
          <input
            id="ownerEmail"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register("ownerEmail")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            New here? We&apos;ll email you a magic sign-in link — no password
            needed.
          </p>
          {errors.ownerEmail && (
            <p className={errorClass}>{errors.ownerEmail.message}</p>
          )}
        </div>
      </div>

      {errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit your listing"}
      </Button>
    </form>
  );
}
