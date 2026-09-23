"use client";

import { createStore } from "zustand";
import {
  bookableMonths,
  currentMonthNY,
  currentYearNY,
  windowMonths,
  windowYears,
  yearMonths,
  type Month,
} from "./months";
import { isBenchAvailable, type DotState } from "./availability";
import { nextYearSelection } from "./month-selection";
import { type Bench, type Region } from "./types";

export const PRICE_PER_YEAR = 4000;

export type CalendarState = "available" | "unavailable" | "selected";

export interface BookedRow {
  bench_id: string;
  month: Month;
}

export interface ReservationInit {
  benches: Bench[];
  booked: BookedRow[];
}

export interface ReservationState {
  benches: Bench[];
  currentMonth: Month;
  currentYear: number;
  windowMonths: Month[];
  windowYearList: number[];
  bookableWindow: Month[];
  bookedByBench: Map<string, Set<Month>>;

  selectedBenchId: string | null;
  selectedYears: number[];
  selectedMonths: Month[];
  regionFilter: Record<Region, boolean>;
  view: "map" | "list";

  donationAmount: number;
  plaqueMessage: string;

  notice: string | null;

  selectBench: (id: string) => void;
  toggleYear: (year: number) => void;
  toggleRegion: (region: Region) => void;
  setView: (view: "map" | "list") => void;
  setBooked: (rows: BookedRow[]) => void;
  setDonationAmount: (amount: number) => void;
  setPlaqueMessage: (msg: string) => void;
  clearNotice: () => void;
  clearSelection: () => void;
}

function buildBookedMap(rows: BookedRow[]): Map<string, Set<Month>> {
  const map = new Map<string, Set<Month>>();
  for (const r of rows) {
    let set = map.get(r.bench_id);
    if (!set) {
      set = new Set();
      map.set(r.bench_id, set);
    }
    set.add(r.month);
  }
  return map;
}

function yearsToMonths(years: number[]): Month[] {
  const sorted = [...years].sort((a, b) => a - b);
  return sorted.flatMap(yearMonths);
}

function isYearBookedForBench(
  year: number,
  bookedMonths: Set<Month> | undefined,
): boolean {
  if (!bookedMonths) return false;
  return yearMonths(year).some((m) => bookedMonths.has(m));
}

export function createReservationStore(init: ReservationInit) {
  const year = currentYearNY();
  const win = windowMonths(year);
  const current = currentMonthNY();
  const bookable = bookableMonths(win, current);
  const yearList = windowYears(year);

  return createStore<ReservationState>((set, get) => ({
    benches: init.benches,
    currentMonth: current,
    currentYear: year,
    windowMonths: win,
    windowYearList: yearList,
    bookableWindow: bookable,
    bookedByBench: buildBookedMap(init.booked),

    selectedBenchId: null,
    selectedYears: [],
    selectedMonths: [],
    regionFilter: { north: true, central: true, south: true },
    view: "map",
    donationAmount: 0,
    plaqueMessage: "",
    notice: null,

    selectBench: (id) => {
      const state = get();
      if (state.selectedBenchId === id) {
        set({ selectedBenchId: null });
        return;
      }
      const bench = state.benches.find((b) => b.id === id);
      if (bench?.restricted) {
        set({
          selectedBenchId: id,
          selectedYears: [],
          selectedMonths: [],
          notice: `Bench ${bench.code} is currently unavailable.`,
        });
        return;
      }
      const booked = state.bookedByBench.get(id) ?? new Set<Month>();
      const availableForSelection = isBenchAvailable(
        booked,
        state.selectedMonths,
        state.bookableWindow,
      );
      if (state.selectedYears.length > 0 && !availableForSelection) {
        const code = bench?.code ?? "";
        set({
          selectedBenchId: id,
          selectedYears: [],
          selectedMonths: [],
          notice: `Dates reset to show when ${code} is available.`,
        });
        return;
      }
      set({ selectedBenchId: id });
    },

    toggleYear: (clickedYear) => {
      const state = get();
      if (state.selectedBenchId) {
        const bench = state.benches.find((b) => b.id === state.selectedBenchId);
        if (bench?.restricted) return;
      }
      const unavailableYears = new Set<number>();
      for (const y of state.windowYearList) {
        if (y < state.currentYear) unavailableYears.add(y);
      }
      if (state.selectedBenchId) {
        const booked = state.bookedByBench.get(state.selectedBenchId);
        if (booked) {
          for (const y of state.windowYearList) {
            if (isYearBookedForBench(y, booked)) unavailableYears.add(y);
          }
        }
      }
      // Adoption must start at the earliest available year for this bench
      let mustStart = state.currentYear;
      for (const y of state.windowYearList) {
        if (!unavailableYears.has(y)) {
          mustStart = y;
          break;
        }
      }
      const result = nextYearSelection(
        state.selectedYears,
        clickedYear,
        unavailableYears,
        mustStart,
      );
      const newMin = result.years.length * PRICE_PER_YEAR;
      set({
        selectedYears: result.years,
        selectedMonths: yearsToMonths(result.years),
        donationAmount: Math.max(state.donationAmount, newMin),
        notice: result.notice ?? state.notice,
      });
    },

    toggleRegion: (region) => {
      const state = get();
      const next = { ...state.regionFilter, [region]: !state.regionFilter[region] };
      let selectedBenchId = state.selectedBenchId;
      if (selectedBenchId) {
        const bench = state.benches.find((b) => b.id === selectedBenchId);
        if (bench && !next[bench.region]) selectedBenchId = null;
      }
      set({ regionFilter: next, selectedBenchId });
    },

    setView: (view) => set({ view }),

    setBooked: (rows) => set({ bookedByBench: buildBookedMap(rows) }),

    setDonationAmount: (amount) => set({ donationAmount: amount }),

    setPlaqueMessage: (msg) => set({ plaqueMessage: msg }),

    clearNotice: () => set({ notice: null }),

    clearSelection: () =>
      set({
        selectedBenchId: null,
        selectedYears: [],
        selectedMonths: [],
        donationAmount: 0,
        plaqueMessage: "",
      }),
  }));
}

export type ReservationStore = ReturnType<typeof createReservationStore>;

// ---- selectors (pure, derived) ----

export function selectVisibleBenches(state: ReservationState): Bench[] {
  return state.benches.filter((b) => state.regionFilter[b.region]);
}

export function benchAvailability(
  state: ReservationState,
  benchId: string,
): boolean {
  const bench = state.benches.find((b) => b.id === benchId);
  if (bench?.restricted) return false;
  const booked = state.bookedByBench.get(benchId) ?? new Set<Month>();
  return isBenchAvailable(booked, state.selectedMonths, state.bookableWindow);
}

export function benchDot(state: ReservationState, benchId: string): DotState {
  if (state.selectedBenchId === benchId) return "selected";
  return benchAvailability(state, benchId) ? "available" : "unavailable";
}

export function yearState(
  state: ReservationState,
  year: number,
): CalendarState {
  if (year < state.currentYear) return "unavailable";
  if (state.selectedBenchId) {
    const bench = state.benches.find((b) => b.id === state.selectedBenchId);
    if (bench?.restricted) return "unavailable";
    const booked = state.bookedByBench.get(state.selectedBenchId);
    if (isYearBookedForBench(year, booked)) return "unavailable";
  }
  if (state.selectedYears.includes(year)) return "selected";
  return "available";
}

export function reserveEnabled(state: ReservationState): boolean {
  return (
    state.selectedBenchId !== null &&
    state.selectedYears.length >= 1 &&
    state.donationAmount >= state.selectedYears.length * PRICE_PER_YEAR &&
    benchAvailability(state, state.selectedBenchId)
  );
}
