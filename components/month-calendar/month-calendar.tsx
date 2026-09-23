"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  yearState,
  type CalendarState,
} from "@/lib/reservation-store";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";

export function MonthCalendar() {
  const store = useReservationApi();
  useReservationStore((s) => s.selectedYears);
  useReservationStore((s) => s.selectedBenchId);
  useReservationStore((s) => s.bookedByBench);

  const years = useReservationStore((s) => s.windowYearList);

  const toggle = React.useCallback(
    (year: number) => store.getState().toggleYear(year),
    [store],
  );

  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="font-serif text-2xl text-park-green">Select years</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {years.map((year) => {
          const state = yearState(store.getState(), year);
          return (
            <YearBlock
              key={year}
              label={String(year)}
              state={state}
              onClick={() => toggle(year)}
            />
          );
        })}
      </div>
    </div>
  );
}

function YearBlock({
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
        "flex h-12 items-center justify-center rounded-lg border text-sm transition-colors",
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
