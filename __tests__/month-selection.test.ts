import { describe, it, expect } from "vitest";
import {
  nextYearSelection,
  LIMIT_NOTICE,
} from "../lib/month-selection";

describe("nextYearSelection", () => {
  it("selects a year when nothing is selected", () => {
    expect(nextYearSelection([], 2026).years).toEqual([2026]);
  });

  it("extends after the last year", () => {
    expect(nextYearSelection([2026], 2027).years).toEqual([2026, 2027]);
  });

  it("extends before the first year", () => {
    expect(nextYearSelection([2027], 2026).years).toEqual([2026, 2027]);
  });

  it("fills the range when clicking a non-adjacent year", () => {
    expect(nextYearSelection([2026, 2027], 2030).years).toEqual([
      2026, 2027, 2028, 2029, 2030,
    ]);
  });

  it("resets to clicked year if unavailable year in between", () => {
    const unavailable = new Set([2028]);
    expect(nextYearSelection([2026, 2027], 2030, unavailable).years).toEqual([
      2030,
    ]);
  });

  it("fills range backward", () => {
    expect(nextYearSelection([2028, 2029], 2026).years).toEqual([
      2026, 2027, 2028, 2029,
    ]);
  });

  it("clicking a selected year deselects it and everything after", () => {
    expect(nextYearSelection([2026, 2027, 2028, 2029], 2028).years).toEqual([
      2026, 2027,
    ]);
  });

  it("clicking the first year clears everything", () => {
    expect(nextYearSelection([2026, 2027, 2028], 2026).years).toEqual([]);
  });

  it("cannot extend past 10 years (selection unchanged + notice)", () => {
    const run = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
    const res = nextYearSelection(run, 2036);
    expect(res.years).toEqual(run);
    expect(res.notice).toBe(LIMIT_NOTICE);
  });

  it("allows exactly 10 years", () => {
    const run = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034];
    const res = nextYearSelection(run, 2035);
    expect(res.years).toHaveLength(10);
    expect(res.notice).toBeUndefined();
  });

  it("unavailable years are not selectable (no-op)", () => {
    const unavailable = new Set([2028]);
    const res = nextYearSelection([2026, 2027], 2028, unavailable);
    expect(res.years).toEqual([2026, 2027]);
  });
});
