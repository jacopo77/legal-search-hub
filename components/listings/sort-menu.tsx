"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

export type SortOption = "name" | "rating" | "reviews";

const LABELS: Record<SortOption, string> = {
  name: "Name (A–Z)",
  rating: "Highest Rated",
  reviews: "Most Reviews",
};

// Small client leaf (CLAUDE.md styling rule) mirroring CitySelector's
// base-ui Menu pattern. Each item is a plain link carrying ?sort=, so the
// result is bookmarkable/crawlable — this only supplies the dropdown
// interaction, not the actual sorting (done server-side in page.tsx).
// Hrefs are precomputed by the server caller rather than passed as a
// function prop — functions can't cross the Server->Client boundary.
export function SortMenu({
  options,
  active,
}: {
  options: { option: SortOption; href: string }[];
  active: SortOption;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        Sort: {LABELS[active]}
        <ChevronDown className="size-4 opacity-60" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end">
          <Menu.Popup className="min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md">
            {options.map(({ option, href }) => (
              <Menu.LinkItem
                key={option}
                href={href}
                closeOnClick
                aria-current={option === active ? "true" : undefined}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm outline-none data-highlighted:bg-muted aria-[current=true]:font-semibold aria-[current=true]:text-primary"
              >
                {LABELS[option]}
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
