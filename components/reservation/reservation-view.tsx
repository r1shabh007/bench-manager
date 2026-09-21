"use client";

import { BenchMap } from "@/components/bench-map/bench-map";
import { BenchList } from "@/components/bench-list/bench-list";
import { MapLegend } from "@/components/bench-map/map-legend";
import { RegionFilter } from "@/components/region-filter/region-filter";
import { ViewToggle } from "@/components/reservation/view-toggle";
import { MonthCalendar } from "@/components/month-calendar/month-calendar";
import { SelectedSummary } from "@/components/reserve-bar/selected-summary";
import { ReserveBar } from "@/components/reserve-bar/reserve-bar";
import { useReservationStore } from "@/components/reservation/reservation-provider";
import { currentYearNY } from "@/lib/months";

export function ReservationView({ isLoggedIn }: { isLoggedIn: boolean }) {
  const view = useReservationStore((s) => s.view);
  const year = currentYearNY();

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wide text-park-rust">
            Bench adoption
          </p>
          <h1 className="font-serif text-4xl text-park-green">Reserve a bench</h1>
        </div>
        <ReserveBar isLoggedIn={isLoggedIn} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ViewToggle />
        <RegionFilter />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3">
          {view === "map" ? <BenchMap /> : <BenchList />}
          <MapLegend />
          <p className="rounded-lg border border-park-border bg-park-surface px-3 py-2 text-xs text-park-muted">
            Benches are available by default unless fully booked across {year}–
            {year + 1}. Selecting an unavailable bench resets dates to show what
            can be booked.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <SelectedSummary />
          <MonthCalendar />
          {!isLoggedIn && (
            <p className="text-xs text-park-rust">
              You&apos;ll be asked to log in before completing this reservation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
