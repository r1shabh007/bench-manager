import { getBenches, getBookedMonths } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { ReservationProvider } from "@/components/reservation/reservation-provider";
import { ReservationView } from "@/components/reservation/reservation-view";

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const [benches, booked, user] = await Promise.all([
    getBenches(),
    getBookedMonths(),
    getSessionUser(),
  ]);

  return (
    <ReservationProvider init={{ benches, booked }}>
      <ReservationView isLoggedIn={Boolean(user)} />
    </ReservationProvider>
  );
}
