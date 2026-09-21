import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserReservations } from "@/lib/data";
import { currentMonthNY } from "@/lib/months";
import { AccountView } from "@/components/account/account-view";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    // Middleware normally handles this; guard here as a fallback.
    redirect("/?login=1");
  }

  const reservations = await getUserReservations(user.id);

  return (
    <AccountView
      user={user}
      reservations={reservations}
      currentMonth={currentMonthNY()}
    />
  );
}
