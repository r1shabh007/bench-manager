import type { Month } from "./months";

export type Region = "north" | "central" | "south";

export const REGIONS: Region[] = ["north", "central", "south"];

export const REGION_LABEL: Record<Region, string> = {
  north: "North",
  central: "Central",
  south: "South",
};

export interface Bench {
  id: string;
  code: string;
  region: Region;
  x_pct: number;
  y_pct: number;
  description: string | null;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface ReservationRow {
  id: string;
  bench_id: string;
  bench_code: string;
  bench_region: Region;
  bench_description: string | null;
  start_month: Month;
  end_month: Month;
  status: "active" | "cancelled";
  created_at: string;
  cancelled_at: string | null;
}

export interface AdminReservationRow extends ReservationRow {
  username: string;
  email: string;
}

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  reservation_count: number;
}

/** Sort benches by region prefix then numeric code (client-safe, pure). */
export function sortByCode(a: { code: string }, b: { code: string }): number {
  const pa = a.code[0];
  const pb = b.code[0];
  if (pa !== pb) return pa.localeCompare(pb);
  return Number(a.code.slice(1)) - Number(b.code.slice(1));
}
