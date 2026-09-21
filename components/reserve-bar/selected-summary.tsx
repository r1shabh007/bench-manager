"use client";

import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";
import { REGION_LABEL } from "@/lib/types";
import { formatRangeCompact, sortMonths } from "@/lib/months";

/** The amber summary card above the calendar (Figma "Selected summary"). */
export function SelectedSummary() {
  const store = useReservationApi();
  const selectedBenchId = useReservationStore((s) => s.selectedBenchId);
  const selectedMonths = useReservationStore((s) => s.selectedMonths);

  const state = store.getState();
  const bench = state.benches.find((b) => b.id === selectedBenchId);

  if (!bench) {
    return (
      <div className="rounded-xl border border-dashed border-park-border bg-park-surface p-4 text-sm text-park-muted">
        Select a bench on the map or list to see its availability.
      </div>
    );
  }

  const sorted = sortMonths(selectedMonths);
  const subtitle =
    sorted.length > 0
      ? `${formatRangeCompact(sorted[0], sorted[sorted.length - 1])} · ${
          sorted.length === 1 ? "1 month" : `${sorted.length} consecutive months`
        }`
      : "Choose one or more continuous months below.";

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
