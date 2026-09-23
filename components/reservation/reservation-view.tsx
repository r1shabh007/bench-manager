"use client";

import { BenchMap } from "@/components/bench-map/bench-map";
import { BenchList } from "@/components/bench-list/bench-list";
import { MapLegend } from "@/components/bench-map/map-legend";
import { RegionFilter } from "@/components/region-filter/region-filter";
import { ViewToggle } from "@/components/reservation/view-toggle";
import { MonthCalendar } from "@/components/month-calendar/month-calendar";
import { DonationInput } from "@/components/donation/donation-input";
import { PlaqueMessage } from "@/components/plaque/plaque-message";
import { SelectedSummary } from "@/components/reserve-bar/selected-summary";
import { ReserveBar } from "@/components/reserve-bar/reserve-bar";
import { useReservationStore } from "@/components/reservation/reservation-provider";

export function ReservationView({
  isLoggedIn,
  hasActiveReservation = false,
}: {
  isLoggedIn: boolean;
  hasActiveReservation?: boolean;
}) {
  const view = useReservationStore((s) => s.view);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-14">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wide text-park-rust">
          Bench adoption
        </p>
        <h1 className="font-serif text-4xl text-park-green">Adopt a bench</h1>
      </div>

      {hasActiveReservation && (
        <div className="mt-4 rounded-xl border border-park-rust/30 bg-park-rust/5 px-4 py-3 text-sm text-park-rust">
          You already have an active adoption. You can only adopt one bench at a time.
          Cancel your current adoption from your{" "}
          <a href="/account" className="font-semibold underline underline-offset-2">
            account page
          </a>{" "}
          to adopt a different bench.
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <ViewToggle />
        <RegionFilter />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3">
          {view === "map" ? <BenchMap /> : <BenchList />}
          <MapLegend />
          <p className="rounded-xl border border-park-border bg-park-surface px-3 py-2 text-xs text-park-muted">
            Benches are available by default unless fully adopted. Selecting
            an unavailable bench resets your selection to show what can be
            adopted.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <SelectedSummary />
          <MonthCalendar />
          <DonationInput />
          <PlaqueMessage />
          <ReserveBar isLoggedIn={isLoggedIn} hasActiveReservation={hasActiveReservation} />
          {!isLoggedIn && (
            <p className="text-center text-xs text-park-rust sm:text-left">
              You&apos;ll be asked to log in before completing this adoption.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
