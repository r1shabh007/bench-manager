/**
 * Pure availability logic, applied identically in the map, the list, and (in
 * spirit) server validation. See spec §5.2 "Availability rule".
 */
import type { Month } from "./months";

export type DotState = "available" | "unavailable" | "selected";

/**
 * Whether a bench is available given the currently booked months for it and the
 * currently selected months.
 *
 * - No months selected: available unless EVERY bookable month in the window is
 *   already reserved.
 * - Months selected: available only if it is free for ALL selected months.
 *
 * `bookableWindow` must already exclude past months (see `bookableMonths`).
 */
export function isBenchAvailable(
  bookedMonths: Set<Month>,
  selectedMonths: Month[],
  bookableWindow: Month[],
): boolean {
  if (selectedMonths.length > 0) {
    return selectedMonths.every((m) => !bookedMonths.has(m));
  }
  // Available if at least one bookable month is free.
  return !bookableWindow.every((m) => bookedMonths.has(m));
}

/** The visual state of a bench dot / list row. */
export function benchDotState(
  isSelected: boolean,
  isAvailable: boolean,
): DotState {
  if (isSelected) return "selected";
  return isAvailable ? "available" : "unavailable";
}
