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
} from "@/lib/reservation-store";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";
import { REGION_LABEL } from "@/lib/types";
import { formatRangeCompact, sortMonths, type Month } from "@/lib/months";
import { createReservationAction } from "@/app/actions/reservations";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const HELPER_TEXT =
  "Select a bench and continuous blocks of time up to 1 year to reserve a bench.";

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

  // Subscribe so the button's enabled state stays live.
  useReservationStore((s) => s.selectedBenchId);
  useReservationStore((s) => s.selectedMonths);
  useReservationStore((s) => s.bookedByBench);

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
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
      store.getState().clearSelection();
      router.refresh();
    } else {
      setConfirmOpen(false);
      toast.error(res.error ?? "Could not complete the reservation.");
      router.refresh();
    }
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setDone(false);
  }

  const sortedSelected = sortMonths(state.selectedMonths);
  const rangeLabel = monthRangeLabel(sortedSelected);

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        disabled={!enabled}
        onClick={startReserve}
        className={cn(
          "inline-flex h-14 items-center justify-center rounded-md px-8 text-base font-bold transition-colors",
          enabled
            ? "bg-park-green text-white hover:bg-park-green/90"
            : "cursor-not-allowed bg-park-border/70 text-park-muted",
        )}
      >
        {bench ? `Reserve bench ${bench.code}` : "Reserve a bench"}
      </button>
      <p className="max-w-sm text-right text-xs text-park-muted">{HELPER_TEXT}</p>

      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => (o ? setConfirmOpen(true) : closeConfirm())}
      >
        <DialogContent className="max-w-md">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle2 className="size-10 text-park-green" />
              <DialogTitle>Bench reserved</DialogTitle>
              <DialogDescription>
                Your adoption is confirmed. You can view and manage it from your
                account.
              </DialogDescription>
              <div className="mt-2 flex gap-2">
                <Link
                  href="/account"
                  onClick={closeConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-park-green px-5 text-sm font-bold text-white hover:bg-park-green/90"
                >
                  Go to account
                </Link>
                <button
                  onClick={closeConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-park-border px-5 text-sm font-semibold text-park-green hover:bg-park-sage/50"
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
                <Row label="Months">{rangeLabel}</Row>
              </dl>
              <DialogFooter>
                <button
                  onClick={closeConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-park-border px-5 text-sm font-semibold text-park-green hover:bg-park-sage/50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirm}
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-park-green px-5 text-sm font-bold text-white hover:bg-park-green/90 disabled:opacity-60"
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

function monthRangeLabel(sorted: Month[]): string {
  if (sorted.length === 0) return "—";
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const count = sorted.length;
  const label = count === 1 ? "1 month" : `${count} months`;
  return `${formatRangeCompact(start, end)}, ${label}`;
}
