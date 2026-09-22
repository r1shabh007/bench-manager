"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/auth-modal/auth-modal-provider";

export function HomeCta({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const { open } = useAuthModal();

  function handleViewReservations() {
    if (loggedIn) {
      router.push("/account");
    } else {
      open({
        tab: "login",
        onSuccess: () => router.push("/account"),
      });
    }
  }

  return (
    <div className="flex gap-3 pt-2">
      <Link
        href="/reservation"
        className="inline-flex h-12 items-center justify-center rounded-lg bg-park-green px-6 text-sm font-bold text-white shadow-md transition-all hover:bg-park-green/90 hover:shadow-lg"
      >
        Find a bench
      </Link>
      <button
        type="button"
        onClick={handleViewReservations}
        className="inline-flex h-12 items-center justify-center rounded-lg border border-park-green/30 bg-park-surface px-6 text-sm font-bold text-park-green transition-all hover:border-park-green hover:bg-park-sage/50"
      >
        View your reservations
      </button>
    </div>
  );
}
