"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export interface ReserveResult {
  ok: boolean;
  error?: string;
  reservationId?: string;
}

/**
 * Create a reservation for the signed-in user. Delegates to the atomic
 * `create_reservation` Postgres function, which enforces all the rules and lets
 * the unique constraint reject double bookings.
 */
export async function createReservationAction(input: {
  benchId: string;
  startMonth: string; // 'YYYY-MM'
  endMonth: string; // 'YYYY-MM'
}): Promise<ReserveResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You must be logged in to reserve a bench." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_reservation", {
    p_user_id: user.id,
    p_bench_id: input.benchId,
    p_start: `${input.startMonth}-01`,
    p_end: `${input.endMonth}-01`,
  });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  revalidatePath("/reservation");
  revalidatePath("/account");
  revalidatePath("/");
  return { ok: true, reservationId: data as string };
}

/** Cancel one of the current user's reservations (ownership re-checked in DB). */
export async function cancelReservationAction(
  reservationId: string,
): Promise<ReserveResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: reservationId,
  });
  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  revalidatePath("/account");
  revalidatePath("/reservation");
  revalidatePath("/");
  return { ok: true };
}

function friendlyError(message: string): string {
  // Postgres RAISE messages are already human-friendly; strip any prefix noise.
  return message.replace(/^.*?:\s*/, "").trim() || "Something went wrong.";
}
