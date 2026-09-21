"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { REGIONS, REGION_LABEL, type Region } from "@/lib/types";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";

export function RegionFilter() {
  const store = useReservationApi();
  const filter = useReservationStore((s) => s.regionFilter);

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Filter by park area">
      {REGIONS.map((region) => (
        <RegionChip
          key={region}
          region={region}
          active={filter[region]}
          onClick={() => store.getState().toggleRegion(region)}
        />
      ))}
    </div>
  );
}

function RegionChip({
  region,
  active,
  onClick,
}: {
  region: Region;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "border-park-green bg-park-green text-white"
          : "border-park-border bg-park-surface text-park-muted hover:border-park-green hover:text-park-green",
      )}
    >
      {REGION_LABEL[region]}
    </button>
  );
}
