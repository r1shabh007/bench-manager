import { getBenches, getBookedMonths } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReservationProvider } from "@/components/reservation/reservation-provider";
import { ReservationView } from "@/components/reservation/reservation-view";

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const [benches, booked, user] = await Promise.all([
    getBenches(),
    getBookedMonths(),
    getSessionUser(),
  ]);

  let hasActiveReservation = false;
  if (user && !user.isAdmin) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    hasActiveReservation = (count ?? 0) >= 1;
  }

  return (
    <ReservationProvider init={{ benches, booked }}>
      <ReservationView
        isLoggedIn={Boolean(user)}
        hasActiveReservation={hasActiveReservation}
      />
    </ReservationProvider>
  );
}
