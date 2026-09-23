"use client";

import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";
import { REGION_LABEL } from "@/lib/types";
import { formatYearRange } from "@/lib/months";

/** The amber summary card above the calendar (Figma "Selected summary"). */
export function SelectedSummary() {
  const store = useReservationApi();
  const selectedBenchId = useReservationStore((s) => s.selectedBenchId);
  const selectedYears = useReservationStore((s) => s.selectedYears);

  const state = store.getState();
  const bench = state.benches.find((b) => b.id === selectedBenchId);

  if (!bench) {
    return (
      <div className="rounded-xl border border-dashed border-park-border bg-park-surface p-4 text-sm text-park-muted">
        Select a bench on the map or list to see its availability.
      </div>
    );
  }

  const sorted = [...selectedYears].sort((a, b) => a - b);
  const subtitle =
    sorted.length > 0
      ? `${formatYearRange(sorted[0], sorted[sorted.length - 1])} · ${
          sorted.length === 1 ? "1 year" : `${sorted.length} consecutive years`
        }`
      : "Choose one or more consecutive years below.";

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-month-summary p-4">
      <p className="text-xs font-bold text-park-ink">
        Bench {bench.code} · {REGION_LABEL[bench.region]}
        {bench.description ? ` · ${bench.description}` : ""}
      </p>
      <p className="text-[13px] text-park-muted">{subtitle}</p>
    </div>
  );
}
