/**
 * Month helpers. A "month" is represented as a `YYYY-MM` string throughout the
 * app. All "current month" decisions use the America/New_York timezone (spec §9).
 */

export type Month = string; // 'YYYY-MM'

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function monthKey(year: number, month1to12: number): Month {
  return `${year}-${String(month1to12).padStart(2, "0")}`;
}

export function parseMonth(m: Month): { year: number; month: number } {
  const [y, mo] = m.split("-");
  return { year: Number(y), month: Number(mo) };
}

/** A comparable integer index for a month (year * 12 + monthIndex0). */
export function monthIndex(m: Month): number {
  const { year, month } = parseMonth(m);
  return year * 12 + (month - 1);
}

export function diffMonths(a: Month, b: Month): number {
  return monthIndex(b) - monthIndex(a);
}

export function addMonths(m: Month, n: number): Month {
  const idx = monthIndex(m) + n;
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return monthKey(year, month);
}

/** Current year/month in America/New_York. */
export function nowNYParts(now: Date = new Date()): { year: number; month: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  return { year, month };
}

export function currentMonthNY(now: Date = new Date()): Month {
  const { year, month } = nowNYParts(now);
  return monthKey(year, month);
}

export function currentYearNY(now: Date = new Date()): number {
  return nowNYParts(now).year;
}

/**
 * All months in the adoption window: current year through 14 years ahead
 * (15 calendar years total), to support up to 10-year adoptions.
 */
export function windowMonths(currentYear: number): Month[] {
  const end = 2040;
  const months: Month[] = [];
  for (let y = currentYear; y <= end; y++) {
    for (let mo = 1; mo <= 12; mo++) {
      months.push(monthKey(y, mo));
    }
  }
  return months;
}

/** The years shown in the adoption picker (current year through 2040). */
export function windowYears(currentYear: number): number[] {
  const end = 2040;
  const count = end - currentYear + 1;
  if (count <= 0) return [currentYear];
  return Array.from({ length: count }, (_, i) => currentYear + i);
}

/** All 12 months of a given year. */
export function yearMonths(year: number): Month[] {
  return Array.from({ length: 12 }, (_, i) => monthKey(year, i + 1));
}

/** Compact year range, e.g. "2026" or "2026–2028". */
export function formatYearRange(startYear: number, endYear: number): string {
  if (startYear === endYear) return `${startYear}`;
  return `${startYear}–${endYear}`;
}

/** Months that can still be booked: the current month onward (past excluded). */
export function bookableMonths(window: Month[], currentMonth: Month): Month[] {
  const cur = monthIndex(currentMonth);
  return window.filter((m) => monthIndex(m) >= cur);
}

export function isPast(m: Month, currentMonth: Month): boolean {
  return monthIndex(m) < monthIndex(currentMonth);
}

export function monthShort(month1to12: number): string {
  return MONTH_SHORT[month1to12 - 1];
}

/** e.g. "Mar 2026". */
export function formatMonthLabel(m: Month): string {
  const { year, month } = parseMonth(m);
  return `${monthShort(month)} ${year}`;
}

/**
 * Human range label, e.g. "Mar 2026 – Aug 2026, 6 months" or, when the years
 * match, "Apr–Jul 2026 · 4 consecutive months"-style compaction is left to the
 * caller. This returns the long form used in confirmation dialogs.
 */
export function formatRange(start: Month, end: Month): string {
  const count = diffMonths(start, end) + 1;
  const label = count === 1 ? "1 month" : `${count} months`;
  if (start === end) return `${formatMonthLabel(start)}, ${label}`;
  return `${formatMonthLabel(start)} – ${formatMonthLabel(end)}, ${label}`;
}

/** Compact range, e.g. "Apr–Jul 2026" or "Oct 2026–Mar 2027". */
export function formatRangeCompact(start: Month, end: Month): string {
  const s = parseMonth(start);
  const e = parseMonth(end);
  if (s.year === e.year) {
    if (s.month === e.month) return `${monthShort(s.month)} ${s.year}`;
    return `${monthShort(s.month)}–${monthShort(e.month)} ${s.year}`;
  }
  return `${monthShort(s.month)} ${s.year}–${monthShort(e.month)} ${e.year}`;
}

export function sortMonths(months: Month[]): Month[] {
  return [...months].sort((a, b) => monthIndex(a) - monthIndex(b));
}
