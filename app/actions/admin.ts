"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  // The signed-in admin's session drives is_admin() inside create_reservation,
  // so created_by is set and the "self only" rule is bypassed for admins.
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
  const admin = createAdminClient();
  const { error } = await admin
    .from("reservations")
    .delete()
    .eq("id", reservationId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  revalidatePath("/reservation");
  return { ok: true };
}

/** Delete a user (cascades to profile + reservations). Cannot delete admins. */
export async function adminDeleteUser(userId: string): Promise<AdminResult> {
  const me = await requireAdmin();
  if (userId === me.id) {
    return { ok: false, error: "You cannot delete your own admin account." };
  }
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (target?.is_admin) {
    return { ok: false, error: "You cannot delete another admin." };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  return { ok: true };
}

/** Add a bench to the program. */
export async function adminAddBench(input: {
  code: string;
  region: Region;
  description?: string;
  xPct?: number;
  yPct?: number;
}): Promise<AdminResult> {
  await requireAdmin();
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a bench code." };
  const admin = createAdminClient();
  const { error } = await admin.from("benches").insert({
    code,
    region: input.region,
    description: input.description?.trim() || null,
    // Default to the middle of the relevant band if no coordinates supplied.
    x_pct: input.xPct ?? 50,
    y_pct: input.yPct ?? defaultBandY(input.region),
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
  const admin = createAdminClient();
  const { error } = await admin.from("benches").delete().eq("id", benchId);
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/admin");
  revalidatePath("/reservation");
  revalidatePath("/");
  return { ok: true };
}

function defaultBandY(region: Region): number {
  if (region === "north") return 19;
  if (region === "central") return 49;
  return 79;
}
