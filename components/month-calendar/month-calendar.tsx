"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  monthState,
  type CalendarState,
} from "@/lib/reservation-store";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";
import { currentYearNY, monthKey, monthShort, type Month } from "@/lib/months";

export function MonthCalendar() {
  const store = useReservationApi();
  // Re-render when selection or booked data changes.
  useReservationStore((s) => s.selectedMonths);
  useReservationStore((s) => s.selectedBenchId);
  useReservationStore((s) => s.bookedByBench);

  const year = currentYearNY();

  const toggle = React.useCallback(
    (month: Month) => store.getState().toggleMonth(month),
    [store],
  );

  return (
    <div className="flex flex-col gap-5">
      <CalendarYear year={year} onToggle={toggle} store={store} />
      <CalendarYear year={year + 1} onToggle={toggle} store={store} />
    </div>
  );
}

function CalendarYear({
  year,
  onToggle,
  store,
}: {
  year: number;
  onToggle: (m: Month) => void;
  store: ReturnType<typeof useReservationApi>;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="font-serif text-2xl text-park-green">{year}</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => {
          const month = monthKey(year, i + 1);
          const state = monthState(store.getState(), month);
          return (
            <MonthBlock
              key={month}
              label={monthShort(i + 1)}
              state={state}
              onClick={() => onToggle(month)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MonthBlock({
  label,
  state,
  onClick,
}: {
  label: string;
  state: CalendarState;
  onClick: () => void;
}) {
  const disabled = state === "unavailable";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={state === "selected"}
      className={cn(
        "flex h-12 items-center justify-center rounded-md border text-sm transition-colors",
        state === "available" &&
          "border-park-border bg-park-surface font-medium text-park-ink hover:border-park-green",
        state === "selected" &&
          "border-month-selected-border bg-month-selected font-bold text-park-ink",
        state === "unavailable" &&
          "cursor-not-allowed border-park-border bg-month-unavailable font-medium text-white",
      )}
    >
      {label}
    </button>
  );
}
