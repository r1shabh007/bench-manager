"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
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
import { User } from "lucide-react";
import {
  formatYearRange,
  parseMonth,
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
  const [showDetails, setShowDetails] = React.useState(false);
  const now = monthIndex(currentMonth);
  const active = reservations.filter(
    (r) => r.status === "active" && monthIndex(r.end_month) >= now,
  );
  const previous = reservations.filter(
    (r) => !(r.status === "active" && monthIndex(r.end_month) >= now),
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-park-rust">
            {user.firstName
              ? `Welcome, ${user.firstName}`
              : `Signed in as ${user.username}`}
          </p>
          <h1 className="font-serif text-4xl text-park-green">
            Your bench adoptions
          </h1>
        </div>
        <button
          onClick={() => setShowDetails((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-full border border-park-border px-4 py-2 text-sm font-semibold text-park-green transition-colors hover:bg-park-sage/50"
        >
          <User className="size-4" />
          Account details
        </button>
      </div>

      {showDetails && (
        <div className="mb-6 rounded-2xl border border-park-border bg-park-surface p-5">
          <h2 className="mb-3 text-sm font-bold text-park-green">
            Account details
          </h2>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {(user.firstName || user.lastName) && (
              <DetailField label="Name">
                {user.firstName} {user.lastName}
              </DetailField>
            )}
            <DetailField label="Username">{user.username}</DetailField>
            <DetailField label="Email">{user.email}</DetailField>
          </div>
        </div>
      )}

      <Section title="Active adoption">
        {active.length === 0 ? (
          <EmptyState>
            You have no active adoptions yet.{" "}
            <Link href="/reservation" className="font-semibold text-park-green underline">
              Adopt a bench
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

      <Section title="Previous adoptions">
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
  const [showPlaque, setShowPlaque] = React.useState(false);
  const startYear = parseMonth(r.start_month).year;
  const endYear = parseMonth(r.end_month).year;
  const count = endYear - startYear + 1;

  async function cancel() {
    setSubmitting(true);
    const res = await cancelReservationAction(r.id);
    setSubmitting(false);
    setConfirmOpen(false);
    if (res.ok) {
      toast.success("Adoption cancelled. Future years are now available.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not cancel the adoption.");
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

      <div className="mt-4 flex flex-wrap gap-8 text-sm">
        <Detail label="Years">
          {formatYearRange(startYear, endYear)}
        </Detail>
        <Detail label="Duration">
          {count} {count === 1 ? "year" : "years"}
        </Detail>
        {r.plaque_message && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowPlaque((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-park-border px-2 py-1 text-xs font-semibold text-park-green transition-colors hover:bg-park-sage/50"
            >
              {showPlaque ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              Plaque
            </button>
          </div>
        )}
      </div>

      {showPlaque && r.plaque_message && (
        <div
          className="mt-3 rounded-lg p-[5px]"
          style={{
            background:
              "linear-gradient(145deg, #c9a84c, #a67c32 30%, #c9a84c 50%, #a67c32 70%, #c9a84c)",
          }}
        >
          <div
            className="rounded-[3px] border-2 px-4 py-3"
            style={{
              background:
                "linear-gradient(160deg, #b8942d, #d4af37 25%, #c9a84c 50%, #b8942d 75%, #d4af37)",
              borderColor: "#8a6914",
            }}
          >
            <p
              className="whitespace-pre-line text-center font-serif text-xs leading-relaxed"
              style={{ color: "#3d2e0a" }}
            >
              {r.plaque_message}
            </p>
          </div>
        </div>
      )}

      {cancellable && (
        <div className="mt-4 flex justify-end border-t border-park-border pt-4">
          <button
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-destructive px-5 text-sm font-bold text-white transition-colors hover:bg-destructive/90"
          >
            Cancel adoption
          </button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Bench {r.bench_code}?</DialogTitle>
            <DialogDescription>
              This action can&apos;t be undone. The years{" "}
              {formatYearRange(startYear, endYear)} that haven&apos;t
              started yet will become available to others.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-park-border px-5 text-sm font-semibold text-park-green hover:bg-park-sage/50"
            >
              Keep adoption
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-park-muted">
        {label}
      </span>
      <span className="font-medium text-park-ink">{children}</span>
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
