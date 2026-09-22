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
        className="inline-flex h-12 items-center justify-center rounded-full bg-park-sage px-7 text-sm font-bold text-park-green shadow-md transition-all hover:bg-white hover:shadow-lg"
      >
        Find a bench
      </Link>
      <button
        type="button"
        onClick={handleViewReservations}
        className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-bold text-white transition-all hover:border-white/60 hover:bg-white/10"
      >
        View your reservations
      </button>
    </div>
  );
}
