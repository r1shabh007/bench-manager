import { describe, it, expect } from "vitest";
import { isBenchAvailable, benchDotState } from "../lib/availability";
import { windowMonths, bookableMonths, type Month } from "../lib/months";

const window24 = windowMonths(2026);
const currentMonth: Month = "2026-09";
const bookable = bookableMonths(window24, currentMonth); // 2026-09 .. 2027-12

describe("isBenchAvailable — no months selected", () => {
  it("available when nothing is booked", () => {
    expect(isBenchAvailable(new Set(), [], bookable)).toBe(true);
  });

  it("available when only some bookable months are booked", () => {
    const booked = new Set<Month>(["2026-09", "2026-10"]);
    expect(isBenchAvailable(booked, [], bookable)).toBe(true);
  });

  it("unavailable only when EVERY bookable month is booked", () => {
    const booked = new Set<Month>(bookable);
    expect(isBenchAvailable(booked, [], bookable)).toBe(false);
  });

  it("past-only bookings never make a bench unavailable", () => {
    const booked = new Set<Month>(["2026-01", "2026-05"]); // all past
    expect(isBenchAvailable(booked, [], bookable)).toBe(true);
  });
});

describe("isBenchAvailable — months selected", () => {
  it("available only if free for ALL selected months", () => {
    const booked = new Set<Month>(["2026-11"]);
    expect(isBenchAvailable(booked, ["2026-09", "2026-10"], bookable)).toBe(true);
    expect(isBenchAvailable(booked, ["2026-10", "2026-11"], bookable)).toBe(false);
  });
});

describe("benchDotState", () => {
  it("selected wins over availability", () => {
    expect(benchDotState(true, false)).toBe("selected");
    expect(benchDotState(true, true)).toBe("selected");
  });
  it("available vs unavailable", () => {
    expect(benchDotState(false, true)).toBe("available");
    expect(benchDotState(false, false)).toBe("unavailable");
  });
});
