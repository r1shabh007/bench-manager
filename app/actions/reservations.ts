"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { currentMonthNY, currentYearNY } from "@/lib/months";

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
  plaqueMessage?: string;
  donationAmount?: number;
}): Promise<ReserveResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "You must be logged in to adopt a bench." };
  }

  const supabase = await createClient();

  if (!user.isAdmin) {
    const { count } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    if ((count ?? 0) >= 1) {
      return {
        ok: false,
        error:
          "You can only adopt one bench at a time. Cancel your current adoption to adopt a different bench.",
      };
    }
  }
  const curMonth = currentMonthNY();
  const curYear = currentYearNY();
  const startYear = parseInt(input.startMonth.slice(0, 4), 10);
  if (startYear < curYear || startYear > 2040) {
    return { ok: false, error: "Invalid adoption start year." };
  }
  const startMonth = input.startMonth < curMonth ? curMonth : input.startMonth;

  const { data, error } = await supabase.rpc("create_reservation", {
    p_user_id: user.id,
    p_bench_id: input.benchId,
    p_start: `${startMonth}-01`,
    p_end: `${input.endMonth}-01`,
  });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  const reservationId = data as string;
  if (input.plaqueMessage || input.donationAmount) {
    const updates: Record<string, unknown> = {};
    if (input.plaqueMessage) updates.plaque_message = input.plaqueMessage;
    if (input.donationAmount) updates.donation_amount = input.donationAmount;
    await supabase
      .from("reservations")
      .update(updates)
      .eq("id", reservationId);
  }

  revalidatePath("/reservation");
  revalidatePath("/account");
  revalidatePath("/");
  return { ok: true, reservationId };
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
