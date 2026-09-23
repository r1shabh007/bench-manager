"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthModal } from "@/components/auth-modal/auth-modal-provider";
import {
  reserveEnabled,
  PRICE_PER_YEAR,
} from "@/lib/reservation-store";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";
import { REGION_LABEL } from "@/lib/types";
import { formatYearRange, sortMonths } from "@/lib/months";
import { createReservationAction } from "@/app/actions/reservations";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const HELPER_TEXT =
  "Select a bench and 1–10 consecutive years to adopt a bench.";

export function ReserveBar({
  isLoggedIn,
  hasActiveReservation = false,
}: {
  isLoggedIn: boolean;
  hasActiveReservation?: boolean;
}) {
  const store = useReservationApi();
  const router = useRouter();
  const { open: openAuth } = useAuthModal();

  useReservationStore((s) => s.selectedBenchId);
  useReservationStore((s) => s.selectedYears);
  useReservationStore((s) => s.bookedByBench);
  useReservationStore((s) => s.donationAmount);
  useReservationStore((s) => s.plaqueMessage);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const state = store.getState();
  const enabled = reserveEnabled(state) && !hasActiveReservation;
  const bench = state.benches.find((b) => b.id === state.selectedBenchId) ?? null;

  function startReserve() {
    if (!enabled) return;
    if (!isLoggedIn) {
      // Keep the current selection and continue after login/signup.
      openAuth({ tab: "login", onSuccess: () => setConfirmOpen(true) });
      return;
    }
    setConfirmOpen(true);
  }

  async function confirm() {
    const s = store.getState();
    if (!s.selectedBenchId || s.selectedMonths.length === 0) return;
    const sorted = sortMonths(s.selectedMonths);
    setSubmitting(true);
    const res = await createReservationAction({
      benchId: s.selectedBenchId,
      startMonth: sorted[0],
      endMonth: sorted[sorted.length - 1],
      plaqueMessage: s.plaqueMessage || undefined,
      donationAmount: s.donationAmount || undefined,
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
      store.getState().clearSelection();
      router.refresh();
    } else {
      setConfirmOpen(false);
      toast.error(res.error ?? "Could not complete the adoption.");
      router.refresh();
    }
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setDone(false);
  }

  const sortedYears = [...state.selectedYears].sort((a, b) => a - b);
  const rangeLabel = yearRangeLabel(sortedYears);
  const donation = state.donationAmount;
  const plaqueMsg = state.plaqueMessage;

  return (
    <div className="flex flex-col items-center gap-1.5 sm:items-start">
      <button
        type="button"
        disabled={!enabled}
        onClick={startReserve}
        className={cn(
          "inline-flex h-14 items-center justify-center rounded-full px-8 text-base font-bold transition-colors",
          enabled
            ? "bg-park-green text-white hover:bg-park-green/90"
            : "cursor-not-allowed bg-park-border/70 text-park-muted",
        )}
      >
        {bench ? `Adopt bench ${bench.code}` : "Adopt a bench"}
      </button>
      {!enabled && <p className="text-center text-xs text-park-muted sm:text-left">{HELPER_TEXT}</p>}

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => (o ? setConfirmOpen(true) : closeConfirm())}
      >
        <DialogContent className="max-w-md">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle2 className="size-10 text-park-green" />
              <DialogTitle>Bench adopted</DialogTitle>
              <DialogDescription>
                Your adoption is confirmed. You can view and manage it from your
                account.
              </DialogDescription>
              <div className="mt-2 flex gap-2">
                <Link
                  href="/account"
                  onClick={closeConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-park-green px-5 text-sm font-bold text-white hover:bg-park-green/90"
                >
                  Go to account
                </Link>
                <button
                  onClick={closeConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-park-border px-5 text-sm font-semibold text-park-green hover:bg-park-sage/50"
                >
                  Keep browsing
                </button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm your adoption</DialogTitle>
                <DialogDescription>
                  Please review the details before confirming.
                </DialogDescription>
              </DialogHeader>
              <dl className="flex flex-col gap-3 rounded-xl border border-park-border bg-park-bg/60 p-4 text-sm">
                <Row label="Bench">
                  {bench ? `${bench.code} · ${REGION_LABEL[bench.region]}` : "—"}
                </Row>
                <Row label="Years">{rangeLabel}</Row>
                <Row label="Donation">${donation.toLocaleString("en-US")}</Row>
                {plaqueMsg && <Row label="Plaque">{plaqueMsg}</Row>}
              </dl>
              <DialogFooter>
                <button
                  onClick={closeConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-park-border px-5 text-sm font-semibold text-park-green hover:bg-park-sage/50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirm}
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-park-green px-5 text-sm font-bold text-white hover:bg-park-green/90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Confirm
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-park-muted">{label}</dt>
      <dd className="font-semibold text-park-ink">{children}</dd>
    </div>
  );
}

function yearRangeLabel(sortedYears: number[]): string {
  if (sortedYears.length === 0) return "—";
  const count = sortedYears.length;
  const label = count === 1 ? "1 year" : `${count} years`;
  return `${formatYearRange(sortedYears[0], sortedYears[sortedYears.length - 1])}, ${label}`;
}
