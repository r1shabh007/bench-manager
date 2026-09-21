/**
 * Pure calendar month-selection reducer (spec §5.2 "Selection rules").
 *
 * The canonical signature from the spec is
 *   nextMonthSelection(current: Month[], clicked: Month): Month[]
 * We extend it with an optional `unavailable` set (gray months for the selected
 * bench) and return an object so the caller can surface the non-blocking notices
 * the rules require. `result.months` is always the new selection.
 *
 * Invariant: `current` is a contiguous, ascending run of months.
 */
import { monthIndex, sortMonths, type Month } from "./months";

export interface SelectionResult {
  months: Month[];
  notice?: string;
}

export const MAX_MONTHS = 12;
export const LIMIT_NOTICE = "Reservations are limited to 12 months.";

export function nextMonthSelection(
  current: Month[],
  clicked: Month,
  unavailable: Set<Month> = new Set(),
): SelectionResult {
  // A run can never include a gray block; gray blocks aren't clickable. No-op.
  if (unavailable.has(clicked)) {
    return { months: current };
  }

  const clickedIdx = monthIndex(clicked);

  // Rule 4: clicking a selected block deselects it and every block after it.
  if (current.includes(clicked)) {
    return { months: current.filter((m) => monthIndex(m) < clickedIdx) };
  }

  // Rule 1: nothing selected -> select the clicked block.
  if (current.length === 0) {
    return { months: [clicked] };
  }

  const sorted = sortMonths(current);
  const firstIdx = monthIndex(sorted[0]);
  const lastIdx = monthIndex(sorted[sorted.length - 1]);
  const isAdjacent = clickedIdx === firstIdx - 1 || clickedIdx === lastIdx + 1;

  // Rule 3: clicking a non-adjacent block resets to just that block.
  if (!isAdjacent) {
    return { months: [clicked] };
  }

  // Rule 2: extend the run (may cross the Dec -> Jan boundary).
  const extended = sortMonths([...sorted, clicked]);

  // Rule 5: never extend past 12 months.
  if (extended.length > MAX_MONTHS) {
    return { months: current, notice: LIMIT_NOTICE };
  }

  return { months: extended };
}
