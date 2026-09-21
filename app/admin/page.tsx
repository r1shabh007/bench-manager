import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getAllReservations,
  getAllUsers,
  getAdminBenches,
} from "@/lib/admin-data";
import { AdminView } from "@/components/admin/admin-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  // Middleware protects this route; guard again as defense in depth.
  if (!user) redirect("/?login=1");
  if (!user.isAdmin) redirect("/");

  const [users, reservations, benches] = await Promise.all([
    getAllUsers(),
    getAllReservations(),
    getAdminBenches(),
  ]);

  return (
    <AdminView
      me={user}
      users={users}
      reservations={reservations}
      benches={benches}
    />
  );
}
