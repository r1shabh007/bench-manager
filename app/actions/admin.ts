"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import type { Region } from "@/lib/types";

export interface AdminResult {
  ok: boolean;
  error?: string;
}

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || !user.isAdmin) {
    throw new Error("Forbidden");
  }
  return user;
}

function friendlyError(message: string): string {
  return message.replace(/^.*?:\s*/, "").trim() || "Something went wrong.";
}

/** Admin creates a reservation on behalf of a user (created_by = admin). */
export async function adminCreateReservation(input: {
  userId: string;
  benchId: string;
  startMonth: string;
  endMonth: string;
}): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_reservation", {
    p_user_id: input.userId,
    p_bench_id: input.benchId,
    p_start: `${input.startMonth}-01`,
    p_end: `${input.endMonth}-01`,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  revalidatePath("/reservation");
  return { ok: true };
}

/** Hard-delete a reservation. */
export async function adminDeleteReservation(
  reservationId: string,
): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  revalidatePath("/reservation");
  return { ok: true };
}

/** Hard-delete multiple reservations at once. */
export async function adminBatchDeleteReservations(
  reservationIds: string[],
): Promise<AdminResult & { deletedCount?: number }> {
  await requireAdmin();
  if (reservationIds.length === 0) return { ok: true, deletedCount: 0 };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("reservations")
    .delete({ count: "exact" })
    .in("id", reservationIds);
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  revalidatePath("/reservation");
  return { ok: true, deletedCount: count ?? reservationIds.length };
}

/** Cancel an active reservation (sets status to cancelled). */
export async function adminCancelReservation(
  reservationId: string,
): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: reservationId,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  revalidatePath("/reservation");
  revalidatePath("/account");
  return { ok: true };
}

/** Cancel multiple active reservations at once. */
export async function adminBatchCancelReservations(
  reservationIds: string[],
): Promise<AdminResult & { cancelledCount?: number }> {
  await requireAdmin();
  if (reservationIds.length === 0) return { ok: true, cancelledCount: 0 };
  const supabase = await createClient();
  const errors: string[] = [];
  let cancelled = 0;
  for (const id of reservationIds) {
    const { error } = await supabase.rpc("cancel_reservation", {
      p_reservation_id: id,
    });
    if (error) errors.push(error.message);
    else cancelled++;
  }
  revalidatePath("/admin");
  revalidatePath("/reservation");
  revalidatePath("/account");
  if (errors.length > 0 && cancelled === 0) {
    return { ok: false, error: friendlyError(errors[0]) };
  }
  return { ok: true, cancelledCount: cancelled };
}

/** Delete a user (cascades to profile + reservations). Cannot delete admins. */
export async function adminDeleteUser(userId: string): Promise<AdminResult> {
  const me = await requireAdmin();
  if (userId === me.id) {
    return { ok: false, error: "You cannot delete your own admin account." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (target?.is_admin) {
    return { ok: false, error: "You cannot delete another admin." };
  }

  // Deleting the auth user requires the service-role key.
  const admin = tryCreateAdminClient();
  if (admin) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: friendlyError(error.message) };
  } else {
    // Without the service-role key, delete the profile (cascades reservations)
    // but the auth.users row remains orphaned.
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (error) return { ok: false, error: friendlyError(error.message) };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Add a bench to the program. */
export async function adminAddBench(input: {
  code: string;
  region: Region;
  description?: string;
  longitude?: number;
  latitude?: number;
}): Promise<AdminResult> {
  await requireAdmin();
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a bench code." };
  const supabase = await createClient();
  const { error } = await supabase.from("benches").insert({
    code,
    region: input.region,
    description: input.description?.trim() || null,
    x_pct: input.longitude ?? DEFAULT_LNG,
    y_pct: input.latitude ?? defaultBandLat(input.region),
  });
  if (error) {
    const msg = error.message.includes("benches_code_key")
      ? `Bench ${code} already exists.`
      : friendlyError(error.message);
    return { ok: false, error: msg };
  }
  revalidatePath("/admin");
  revalidatePath("/reservation");
  revalidatePath("/");
  return { ok: true };
}

/** Remove a bench that is no longer available for adoption. */
export async function adminDeleteBench(benchId: string): Promise<AdminResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("benches").delete().eq("id", benchId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  revalidatePath("/reservation");
  revalidatePath("/");
  return { ok: true };
}

const DEFAULT_LNG = -73.8867;

function defaultBandLat(region: Region): number {
  if (region === "north") return 40.9050;
  if (region === "central") return 40.8960;
  return 40.8870;
}
