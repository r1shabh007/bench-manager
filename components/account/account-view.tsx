"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { REGION_LABEL, type ReservationRow, type SessionUser } from "@/lib/types";
import {
  diffMonths,
  formatRangeCompact,
  monthIndex,
  type Month,
} from "@/lib/months";
import { cancelReservationAction } from "@/app/actions/reservations";
import { toast } from "@/lib/toast";

export function AccountView({
  user,
  reservations,
  currentMonth,
}: {
  user: SessionUser;
  reservations: ReservationRow[];
  currentMonth: Month;
}) {
  const now = monthIndex(currentMonth);
  const active = reservations.filter(
    (r) => r.status === "active" && monthIndex(r.end_month) >= now,
  );
  const previous = reservations.filter(
    (r) => !(r.status === "active" && monthIndex(r.end_month) >= now),
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-10">
      <p className="text-xs font-bold uppercase tracking-wide text-park-rust">
        Signed in as {user.username}
      </p>
      <h1 className="mb-6 font-serif text-4xl text-park-green">
        Your bench adoptions
      </h1>

      <Section title="Active reservation">
        {active.length === 0 ? (
          <EmptyState>
            You have no active adoptions yet.{" "}
            <Link href="/reservation" className="font-semibold text-park-green underline">
              Reserve a bench
            </Link>
            .
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            {active.map((r) => (
              <ReservationCard key={r.id} r={r} cancellable />
            ))}
          </div>
        )}
      </Section>

      <Section title="Previous reservations">
        {previous.length === 0 ? (
          <EmptyState>Past and cancelled adoptions will appear here.</EmptyState>
        ) : (
          <div className="flex flex-col gap-4">
            {previous.map((r) => (
              <ReservationCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-bold text-park-green">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-park-border bg-park-surface p-6 text-sm text-park-muted">
      {children}
    </div>
  );
}

function ReservationCard({
  r,
  cancellable,
}: {
  r: ReservationRow;
  cancellable?: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const count = diffMonths(r.start_month, r.end_month) + 1;

  async function cancel() {
    setSubmitting(true);
    const res = await cancelReservationAction(r.id);
    setSubmitting(false);
    setConfirmOpen(false);
    if (res.ok) {
      toast.success("Reservation cancelled. Future months are now available.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not cancel the reservation.");
    }
  }

  return (
    <div className="rounded-2xl border border-park-border bg-park-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-2xl text-park-green">
            Bench {r.bench_code}
          </p>
          <p className="text-sm text-park-muted">
            {r.bench_description ? `${r.bench_description} · ` : ""}
            {REGION_LABEL[r.bench_region]}
          </p>
        </div>
        <StatusBadge status={r.status} ended={count > 0 && !cancellable} />
      </div>

      <div className="mt-4 flex gap-8 text-sm">
        <Detail label="Dates">
          {formatRangeCompact(r.start_month, r.end_month)}
        </Detail>
        <Detail label="Duration">
          {count} {count === 1 ? "month" : "months"}
        </Detail>
      </div>

      {cancellable && (
        <div className="mt-4 flex justify-end border-t border-park-border pt-4">
          <button
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-destructive px-5 text-sm font-bold text-white transition-colors hover:bg-destructive/90"
          >
            Cancel reservation
          </button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Bench {r.bench_code}?</DialogTitle>
            <DialogDescription>
              This action can&apos;t be undone. The months{" "}
              {formatRangeCompact(r.start_month, r.end_month)} that haven&apos;t
              started yet will become available to others.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-park-border px-5 text-sm font-semibold text-park-green hover:bg-park-sage/50"
            >
              Keep reservation
            </button>
            <button
              onClick={cancel}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-destructive px-5 text-sm font-bold text-white hover:bg-destructive/90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Yes, cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-park-muted">
        {label}
      </span>
      <span className="font-semibold text-park-ink">{children}</span>
    </div>
  );
}

function StatusBadge({
  status,
  ended,
}: {
  status: "active" | "cancelled";
  ended?: boolean;
}) {
  const label =
    status === "cancelled" ? "Cancelled" : ended ? "Completed" : "Active";
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        status === "cancelled"
          ? "bg-destructive/10 text-destructive"
          : ended
            ? "bg-park-sage text-park-muted"
            : "bg-park-sage text-park-green",
      )}
    >
      {label}
    </span>
  );
}
