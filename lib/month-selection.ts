/**
 * Year-selection reducer for the adoption picker.
 *
 * Users select contiguous years (up to 10) that must include the current year.
 * Internally, each selected year maps to all 12 of its months so the rest of
 * the system (availability, server actions, database) works unchanged at month
 * granularity.
 */

export interface YearSelectionResult {
  years: number[];
  notice?: string;
}

export const MAX_YEARS = 10;
export const LIMIT_NOTICE = "Adoptions are limited to 10 years.";
export const START_YEAR_NOTICE = "Adoptions must start at the earliest available year.";

export function nextYearSelection(
  current: number[],
  clicked: number,
  unavailable: Set<number> = new Set(),
  mustStartYear?: number,
): YearSelectionResult {
  if (unavailable.has(clicked)) {
    return { years: current };
  }

  if (current.includes(clicked)) {
    const filtered = current.filter((y) => y < clicked);
    if (mustStartYear !== undefined && filtered.length > 0 && !filtered.includes(mustStartYear)) {
      return { years: [], notice: START_YEAR_NOTICE };
    }
    return { years: filtered };
  }

  if (current.length === 0) {
    if (mustStartYear !== undefined && clicked !== mustStartYear) {
      return { years: [], notice: START_YEAR_NOTICE };
    }
    return { years: [clicked] };
  }

  const sorted = [...current].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const rangeStart = Math.min(first, clicked);
  const rangeEnd = Math.max(last, clicked);

  if (mustStartYear !== undefined && rangeStart > mustStartYear) {
    return { years: current, notice: START_YEAR_NOTICE };
  }

  const span = rangeEnd - rangeStart + 1;

  if (span > MAX_YEARS) {
    return { years: current, notice: LIMIT_NOTICE };
  }

  const range: number[] = [];
  for (let y = rangeStart; y <= rangeEnd; y++) {
    if (unavailable.has(y)) {
      return { years: [clicked] };
    }
    range.push(y);
  }

  if (mustStartYear !== undefined && !range.includes(mustStartYear)) {
    return { years: current, notice: START_YEAR_NOTICE };
  }

  return { years: range };
}
