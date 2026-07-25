"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

// Matches the shape SiteNav passes down (plain serializable data, mapped to
// camelCase at the query boundary — see site-nav.tsx).
export type CitySelectorCity = {
  slug: string;
  name: string;
  state: string;
  status: "live" | "coming_soon";
};

// City dropdown in the nav. Fully data-driven: live cities are links,
// coming_soon cities are disabled items — never hardcode a city here
// (CLAUDE.md rule 1).
export function CitySelector({ cities }: { cities: CitySelectorCity[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        Cities
        <ChevronDown className="size-4 opacity-60" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start">
          <Menu.Popup className="min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md">
            {cities.map((city) =>
              city.status === "live" ? (
                <Menu.LinkItem
                  key={city.slug}
                  href={`/${city.slug}`}
                  closeOnClick
                  className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm outline-none data-highlighted:bg-muted"
                >
                  {city.name}, {city.state}
                </Menu.LinkItem>
              ) : (
                <Menu.Item
                  key={city.slug}
                  disabled
                  className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm text-muted-foreground opacity-70"
                >
                  <span>
                    {city.name}, {city.state}
                  </span>
                  <span className="ml-3 text-xs">Coming soon</span>
                </Menu.Item>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
