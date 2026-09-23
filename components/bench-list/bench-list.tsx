"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGION_LABEL, sortByCode } from "@/lib/types";
import {
  benchDot,
  selectVisibleBenches,
} from "@/lib/reservation-store";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";

export function BenchList() {
  const store = useReservationApi();
  const visible = useReservationStore(selectVisibleBenches);
  const selectedBenchId = useReservationStore((s) => s.selectedBenchId);
  useReservationStore((s) => s.selectedYears);
  useReservationStore((s) => s.bookedByBench);

  const [asc, setAsc] = React.useState(true);

  const rows = React.useMemo(() => {
    const sorted = [...visible].sort(sortByCode);
    return asc ? sorted : sorted.reverse();
  }, [visible, asc]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-park-border bg-park-surface">
      <div className="flex items-center justify-between border-b border-park-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-park-muted">
        <button
          type="button"
          onClick={() => setAsc((v) => !v)}
          className="flex items-center gap-1.5 hover:text-park-green"
          aria-label={`Sort by code ${asc ? "descending" : "ascending"}`}
        >
          Bench <ArrowUpDown className="size-3.5" />
        </button>
        <span className="hidden sm:block">Region</span>
        <span>Availability</span>
      </div>
      <div ref={parentRef} className="max-h-[440px] overflow-auto">
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const bench = rows[vi.index];
            const state = benchDot(store.getState(), bench.id);
            const selected = bench.id === selectedBenchId;
            return (
              <button
                key={bench.id}
                type="button"
                onClick={() => store.getState().selectBench(bench.id)}
                aria-pressed={selected}
                className={cn(
                  "absolute left-0 top-0 flex w-full items-center justify-between border-b border-park-border px-4 text-left transition-colors",
                  selected ? "bg-month-summary" : "hover:bg-park-sage/40",
                )}
                style={{
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      state === "selected" && "bg-bench-selected",
                      state === "available" && "bg-bench-available",
                      state === "unavailable" && "bg-bench-unavailable",
                    )}
                  />
                  <span className="font-semibold text-park-ink">
                    {bench.code}
                  </span>
                </span>
                <span className="hidden text-sm text-park-muted sm:block">
                  {REGION_LABEL[bench.region]}
                </span>
                <AvailabilityBadge state={state} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AvailabilityBadge({
  state,
}: {
  state: "available" | "unavailable" | "selected";
}) {
  const label =
    state === "selected"
      ? "Selected"
      : state === "available"
        ? "Available"
        : "Unavailable";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        state === "selected" && "bg-month-selected text-park-ink",
        state === "available" && "bg-bench-available/15 text-bench-available",
        state === "unavailable" && "bg-park-sage text-park-muted",
      )}
    >
      {label}
    </span>
  );
}
