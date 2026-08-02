"use client";

import { Heart } from "lucide-react";
import { useSavedFirm } from "@/lib/saved-firms";
import { cn } from "@/lib/utils";

// Small client leaf (CLAUDE.md styling rule): reads/toggles saved state via
// the shared lib/saved-firms.ts store. "icon" is the compact circular
// overlay used on listing cards; "labeled" is the inline pill used on the
// firm detail page and the /saved list, where there's room for a word.
export function SaveButton({
  firmId,
  variant = "icon",
  className,
}: {
  firmId: string;
  variant?: "icon" | "labeled";
  className?: string;
}) {
  const { saved, toggle } = useSavedFirm(firmId);

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          saved
            ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-border text-foreground hover:bg-muted",
          className,
        )}
      >
        <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved firms" : "Save this firm"}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full bg-white/90 text-navy shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Heart
        className={cn("size-4", saved && "fill-current text-red-500")}
        aria-hidden
      />
    </button>
  );
}
