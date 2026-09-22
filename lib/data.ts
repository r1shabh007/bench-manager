import "server-only";
import { createClient } from "./supabase/server";
import { currentYearNY, monthKey } from "./months";
import { generatePlaceholderBenches } from "./placeholder-benches";
import { sortByCode, type Bench, type Region, type ReservationRow } from "./types";

export { sortByCode };

/** All benches, ordered by region then numeric code. */
export async function getBenches(): Promise<Bench[]> {
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("benches")
    .select("id, code, region, x_pct, y_pct, description, restricted");
  if (error) {
    const fallback = await supabase
      .from("benches")
      .select("id, code, region, x_pct, y_pct, description");
    data = fallback.data as any;
    error = fallback.error;
  }
  if (error) {
    console.warn("[getBenches] using placeholder benches:", error.message);
    return generatePlaceholderBenches();
  }
  const benches = ((data ?? []) as (Omit<Bench, "longitude" | "latitude"> & { x_pct: number; y_pct: number })[]).map((b) => {
    const xVal = Number(b.x_pct);
    const yVal = Number(b.y_pct);
    const isLegacy = xVal >= 0 && xVal <= 100 && yVal >= 0 && yVal <= 100;
    return {
      id: b.id,
      code: b.code,
      region: b.region,
      longitude: isLegacy ? pctToLng(xVal) : xVal,
      latitude: isLegacy ? pctToLat(yVal) : yVal,
      description: b.description,
      restricted: Boolean((b as any).restricted),
    };
  });
  if (benches.length === 0) return generatePlaceholderBenches();
  return benches.sort(sortByCode);
}

/**
 * All booked (bench_id, month) pairs within the current 24-month window.
 * Months are returned as `YYYY-MM` strings. Public data (no personal info).
 */
export async function getBookedMonths(): Promise<
  { bench_id: string; month: string }[]
> {
  const supabase = await createClient();
  const year = currentYearNY();
  const start = `${year}-01-01`;
  const end = `${monthKey(year + 1, 12)}-01`;
  const { data, error } = await supabase
    .from("reservation_months")
    .select("bench_id, month")
    .gte("month", start)
    .lte("month", end);
  if (error) {
    console.warn("[getBookedMonths] falling back to empty:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    bench_id: r.bench_id as string,
    month: toMonthKey(r.month as string),
  }));
}

/** Reservations for a given user, newest first, with bench info joined. */
export async function getUserReservations(
  userId: string,
): Promise<ReservationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, bench_id, start_month, end_month, status, created_at, cancelled_at, benches(code, region, description)",
    )
    .eq("user_id", userId)
    .order("start_month", { ascending: false });
  if (error) {
    console.warn("[getUserReservations] falling back to empty:", error.message);
    return [];
  }
  return (data ?? []).map(mapReservationRow);
}

// ---- helpers ----

function toMonthKey(dateStr: string): string {
  // Postgres date comes back as 'YYYY-MM-DD'.
  return dateStr.slice(0, 7);
}

interface RawReservation {
  id: string;
  bench_id: string;
  start_month: string;
  end_month: string;
  status: "active" | "cancelled";
  created_at: string;
  cancelled_at: string | null;
  benches: { code: string; region: Region; description: string | null } | null;
}

export function mapReservationRow(r: unknown): ReservationRow {
  const row = r as RawReservation;
  return {
    id: row.id,
    bench_id: row.bench_id,
    bench_code: row.benches?.code ?? "?",
    bench_region: row.benches?.region ?? "north",
    bench_description: row.benches?.description ?? null,
    start_month: toMonthKey(row.start_month),
    end_month: toMonthKey(row.end_month),
    status: row.status,
    created_at: row.created_at,
    cancelled_at: row.cancelled_at,
  };
}

const PARK_LNG_MIN = -73.9020;
const PARK_LNG_MAX = -73.8720;
const PARK_LAT_MIN = 40.8830;
const PARK_LAT_MAX = 40.9120;

function pctToLng(pct: number): number {
  return PARK_LNG_MIN + (pct / 100) * (PARK_LNG_MAX - PARK_LNG_MIN);
}

function pctToLat(pct: number): number {
  return PARK_LAT_MAX - (pct / 100) * (PARK_LAT_MAX - PARK_LAT_MIN);
}

