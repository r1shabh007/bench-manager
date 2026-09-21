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
      .select("id, username, email, is_admin, created_at")
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
      "id, bench_id, user_id, start_month, end_month, status, created_at, cancelled_at, benches(code, region, description), profiles(username, email)",
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => {
    const base = mapReservationRow(r);
    const profile = (r as { profiles?: { username?: string; email?: string } })
      .profiles;
    return {
      ...base,
      username: profile?.username ?? "?",
      email: profile?.email ?? "",
    } satisfies AdminReservationRow;
  });
}

export async function getAdminBenches(): Promise<Bench[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("benches")
    .select("id, code, region, x_pct, y_pct, description");
  return ((data ?? []) as Bench[]).sort(sortByCode);
}

export type { Region };
