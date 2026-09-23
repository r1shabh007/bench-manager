"use client";

import * as React from "react";
import { PRICE_PER_YEAR } from "@/lib/reservation-store";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function parse(s: string): number {
  const digits = s.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function DonationInput() {
  const store = useReservationApi();
  const selectedYears = useReservationStore((s) => s.selectedYears);
  const selectedBenchId = useReservationStore((s) => s.selectedBenchId);

  const yearCount = selectedYears.length;
  const minimum = yearCount * PRICE_PER_YEAR;
  const active = selectedBenchId !== null && yearCount > 0;

  const [raw, setRaw] = React.useState("");
  const typed = parse(raw);
  const tooLow = raw !== "" && typed < minimum;

  React.useEffect(() => {
    setRaw("");
    store.getState().setDonationAmount(0);
  }, [yearCount, store]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    if (digits === "") {
      setRaw("");
      store.getState().setDonationAmount(0);
      return;
    }
    const num = parseInt(digits, 10);
    setRaw(fmt(num));
    store.getState().setDonationAmount(num);
  }

  const subtitleText = active
    ? `$${fmt(PRICE_PER_YEAR)} per year × ${yearCount} ${yearCount === 1 ? "year" : "years"} = $${fmt(minimum)} minimum`
    : `$${fmt(PRICE_PER_YEAR)} per year minimum`;

  return (
    <div className={`flex flex-col gap-2.5 transition-opacity ${active ? "" : "pointer-events-none opacity-40"}`}>
      <h3 className="font-serif text-2xl text-park-green">Donation</h3>
      <p className="text-xs text-park-muted">{subtitleText}</p>
      <div className="relative">
        <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold ${tooLow ? "text-destructive" : "text-park-green"}`}>
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          disabled={!active}
          placeholder={active ? fmt(minimum) : fmt(PRICE_PER_YEAR)}
          className={`h-14 w-full rounded-xl border bg-park-surface pl-9 pr-4 text-lg font-semibold outline-none transition-colors placeholder:text-park-muted/50 disabled:cursor-not-allowed disabled:bg-park-surface/50 ${
            tooLow
              ? "border-destructive text-destructive focus:border-destructive focus:ring-1 focus:ring-destructive"
              : "border-park-border text-park-ink focus:border-park-green focus:ring-1 focus:ring-park-green"
          }`}
        />
      </div>
      {tooLow && (
        <p className="text-xs font-medium text-destructive">
          Minimum donation is ${fmt(minimum)}
        </p>
      )}
    </div>
  );
}
