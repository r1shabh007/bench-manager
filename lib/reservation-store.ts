"use client";

import { createStore } from "zustand";
import {
  bookableMonths,
  currentMonthNY,
  currentYearNY,
  windowMonths,
  isPast,
  type Month,
} from "./months";
import { isBenchAvailable, type DotState } from "./availability";
import { nextMonthSelection } from "./month-selection";
import { type Bench, type Region } from "./types";

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
  windowMonths: Month[];
  bookableWindow: Month[];
  bookedByBench: Map<string, Set<Month>>;

  selectedBenchId: string | null;
  selectedMonths: Month[];
  regionFilter: Record<Region, boolean>;
  view: "map" | "list";

  // Non-blocking notice consumed by the UI (toast) then cleared.
  notice: string | null;

  // actions
  selectBench: (id: string) => void;
  toggleMonth: (month: Month) => void;
  toggleRegion: (region: Region) => void;
  setView: (view: "map" | "list") => void;
  setBooked: (rows: BookedRow[]) => void;
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

export function createReservationStore(init: ReservationInit) {
  const year = currentYearNY();
  const win = windowMonths(year);
  const current = currentMonthNY();
  const bookable = bookableMonths(win, current);

  return createStore<ReservationState>((set, get) => ({
    benches: init.benches,
    currentMonth: current,
    windowMonths: win,
    bookableWindow: bookable,
    bookedByBench: buildBookedMap(init.booked),

    selectedBenchId: null,
    selectedMonths: [],
    regionFilter: { north: true, central: true, south: true },
    view: "map",
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
      if (state.selectedMonths.length > 0 && !availableForSelection) {
        const code = bench?.code ?? "";
        set({
          selectedBenchId: id,
          selectedMonths: [],
          notice: `Dates reset to show when ${code} is available.`,
        });
        return;
      }
      set({ selectedBenchId: id });
    },

    toggleMonth: (month) => {
      const state = get();
      if (state.selectedBenchId) {
        const bench = state.benches.find((b) => b.id === state.selectedBenchId);
        if (bench?.restricted) return;
      }
      const unavailable = new Set<Month>();
      for (const m of state.windowMonths) {
        if (isPast(m, state.currentMonth)) unavailable.add(m);
      }
      if (state.selectedBenchId) {
        const booked = state.bookedByBench.get(state.selectedBenchId);
        if (booked) for (const m of booked) unavailable.add(m);
      }
      const result = nextMonthSelection(
        state.selectedMonths,
        month,
        unavailable,
      );
      set({
        selectedMonths: result.months,
        notice: result.notice ?? state.notice,
      });
    },

    toggleRegion: (region) => {
      const state = get();
      const next = { ...state.regionFilter, [region]: !state.regionFilter[region] };

      // If the selected bench is now hidden, deselect it.
      let selectedBenchId = state.selectedBenchId;
      if (selectedBenchId) {
        const bench = state.benches.find((b) => b.id === selectedBenchId);
        if (bench && !next[bench.region]) selectedBenchId = null;
      }
      set({ regionFilter: next, selectedBenchId });
    },

    setView: (view) => set({ view }),

    setBooked: (rows) => set({ bookedByBench: buildBookedMap(rows) }),

    clearNotice: () => set({ notice: null }),

    clearSelection: () => set({ selectedBenchId: null, selectedMonths: [] }),
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

export function monthState(state: ReservationState, month: Month): CalendarState {
  if (isPast(month, state.currentMonth)) return "unavailable";
  if (state.selectedBenchId) {
    const bench = state.benches.find((b) => b.id === state.selectedBenchId);
    if (bench?.restricted) return "unavailable";
    const booked = state.bookedByBench.get(state.selectedBenchId);
    if (booked?.has(month)) return "unavailable";
  }
  if (state.selectedMonths.includes(month)) return "selected";
  return "available";
}

export function reserveEnabled(state: ReservationState): boolean {
  return (
    state.selectedBenchId !== null &&
    state.selectedMonths.length >= 1 &&
    benchAvailability(state, state.selectedBenchId)
  );
}
