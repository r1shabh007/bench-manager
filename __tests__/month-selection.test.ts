import { describe, it, expect } from "vitest";
import {
  nextMonthSelection,
  LIMIT_NOTICE,
} from "../lib/month-selection";

describe("nextMonthSelection", () => {
  it("rule 1: selects a block when nothing is selected", () => {
    expect(nextMonthSelection([], "2026-03").months).toEqual(["2026-03"]);
  });

  it("rule 2: extends after the last block", () => {
    expect(nextMonthSelection(["2026-03"], "2026-04").months).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("rule 2: extends before the first block", () => {
    expect(nextMonthSelection(["2026-04"], "2026-03").months).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("rule 2: extends across the Dec -> Jan year boundary", () => {
    expect(nextMonthSelection(["2026-12"], "2027-01").months).toEqual([
      "2026-12",
      "2027-01",
    ]);
    expect(nextMonthSelection(["2027-01"], "2026-12").months).toEqual([
      "2026-12",
      "2027-01",
    ]);
  });

  it("rule 3: clicking a non-adjacent block fills the range", () => {
    expect(
      nextMonthSelection(["2026-03", "2026-04"], "2026-08").months,
    ).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("rule 3: range fill resets to clicked block if unavailable month in between", () => {
    const unavailable = new Set(["2026-06"]);
    expect(
      nextMonthSelection(["2026-03", "2026-04"], "2026-08", unavailable).months,
    ).toEqual(["2026-08"]);
  });

  it("rule 3: range fill works backward", () => {
    expect(
      nextMonthSelection(["2026-06", "2026-07"], "2026-03").months,
    ).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("rule 4: clicking a selected block deselects it and everything after", () => {
    const run = ["2026-03", "2026-04", "2026-05", "2026-06"];
    expect(nextMonthSelection(run, "2026-05").months).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("rule 4: clicking the first block clears everything", () => {
    const run = ["2026-03", "2026-04", "2026-05"];
    expect(nextMonthSelection(run, "2026-03").months).toEqual([]);
  });

  it("rule 5: cannot extend past 12 months (selection unchanged + notice)", () => {
    const run = [
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ];
    const res = nextMonthSelection(run, "2027-01");
    expect(res.months).toEqual(run);
    expect(res.notice).toBe(LIMIT_NOTICE);
  });

  it("allows exactly 12 months", () => {
    const run = [
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ];
    const res = nextMonthSelection(run, "2026-12");
    expect(res.months).toHaveLength(12);
    expect(res.notice).toBeUndefined();
  });

  it("rule 6: gray (unavailable) blocks are not selectable (no-op)", () => {
    const unavailable = new Set(["2026-05"]);
    const res = nextMonthSelection(["2026-03", "2026-04"], "2026-05", unavailable);
    expect(res.months).toEqual(["2026-03", "2026-04"]);
  });
});
