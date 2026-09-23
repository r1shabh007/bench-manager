import "server-only";
import { createClient } from "./supabase/server";
import { mapReservationRow, sortByCode } from "./data";
import type {
  AdminReservationRow,
  AdminUserRow,
  Bench,
  Region,
} from "./types";

/**
 * Admin reads go through the SSR server client — the signed-in admin passes the
 * RLS `is_admin()` checks, so no service-role key is needed for reads.
 */

export async function getAllUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: reservations }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, first_name, last_name, email, is_admin, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("reservations").select("user_id"),
  ]);

  const counts = new Map<string, number>();
  for (const r of reservations ?? []) {
    const uid = (r as { user_id: string }).user_id;
    counts.set(uid, (counts.get(uid) ?? 0) + 1);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    first_name: (p.first_name as string) ?? "",
    last_name: (p.last_name as string) ?? "",
    email: p.email as string,
    is_admin: p.is_admin as boolean,
    created_at: p.created_at as string,
    reservation_count: counts.get(p.id as string) ?? 0,
  }));
}

export async function getAllReservations(): Promise<AdminReservationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(
      "id, bench_id, user_id, start_month, end_month, status, created_at, cancelled_at, plaque_message, donation_amount, benches(code, region, description), profiles!user_id(username, first_name, last_name, email)",
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => {
    const base = mapReservationRow(r);
    const profile = (r as { profiles?: { username?: string; first_name?: string; last_name?: string; email?: string } })
      .profiles;
    return {
      ...base,
      username: profile?.username ?? "?",
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      email: profile?.email ?? "",
    } satisfies AdminReservationRow;
  });
}

export async function getAdminBenches(): Promise<Bench[]> {
  const supabase = await createClient();
  let { data } = await supabase
    .from("benches")
    .select("id, code, region, x_pct, y_pct, description, restricted");
  if (!data) {
    const fallback = await supabase
      .from("benches")
      .select("id, code, region, x_pct, y_pct, description");
    data = fallback.data as any;
  }
  return ((data ?? []) as (Omit<Bench, "longitude" | "latitude"> & { x_pct: number; y_pct: number })[])
    .map((b) => ({
      id: b.id,
      code: b.code,
      region: b.region,
      longitude: Number(b.x_pct),
      latitude: Number(b.y_pct),
      description: b.description,
      restricted: Boolean((b as any).restricted),
    }))
    .sort(sortByCode);
}

export type { Region };
