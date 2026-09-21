"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  REGIONS,
  REGION_LABEL,
  type AdminReservationRow,
  type AdminUserRow,
  type Bench,
  type Region,
  type SessionUser,
} from "@/lib/types";
import {
  currentYearNY,
  formatMonthLabel,
  formatRangeCompact,
  monthIndex,
  monthKey,
  windowMonths,
  type Month,
} from "@/lib/months";
import { toast } from "@/lib/toast";
import {
  adminAddBench,
  adminBatchDeleteReservations,
  adminCreateReservation,
  adminDeleteBench,
  adminDeleteReservation,
  adminDeleteUser,
} from "@/app/actions/admin";

export function AdminView({
  me,
  users,
  reservations,
  benches,
}: {
  me: SessionUser;
  users: AdminUserRow[];
  reservations: AdminReservationRow[];
  benches: Bench[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-10">
      <p className="text-xs font-bold uppercase tracking-wide text-park-rust">
        Authenticated admin workspace
      </p>
      <h1 className="mb-1 font-serif text-4xl text-park-green">
        Program administration
      </h1>
      <p className="mb-6 text-sm text-park-muted">
        {me.email} · Predefined administrator account
      </p>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <UserManagement users={users} meId={me.id} />
          <BenchManagement benches={benches} />
          <ReservationManagement reservations={reservations} />
        </div>
        <CreateReservationPanel users={users} benches={benches} />
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-park-border bg-park-surface p-5">
      <h2 className="text-lg font-bold text-park-green">{title}</h2>
      {description && (
        <p className="mb-3 mt-0.5 text-sm text-park-muted">{description}</p>
      )}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
    >
      <Trash2 className="size-3.5" /> Delete
    </button>
  );
}

// ---------------------------------------------------------------- Users
function UserManagement({
  users,
  meId,
}: {
  users: AdminUserRow[];
  meId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [target, setTarget] = React.useState<AdminUserRow | null>(null);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()),
  );

  async function remove() {
    if (!target) return;
    const res = await adminDeleteUser(target.id);
    if (res.ok) {
      toast.success(`Deleted ${target.username}.`);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete user.");
    }
  }

  return (
    <Panel title="User management">
      <Input
        placeholder="Search by username or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 bg-park-bg/50"
      />
      <div className="overflow-hidden rounded-xl border border-park-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-park-muted">No users found.</p>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 border-b border-park-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-park-ink">
                  {u.username}
                  {u.is_admin && (
                    <span className="ml-2 rounded bg-park-sage px-1.5 py-0.5 text-[10px] font-bold uppercase text-park-green">
                      Admin
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-park-muted">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-park-muted sm:block">
                  {u.reservation_count}{" "}
                  {u.reservation_count === 1 ? "reservation" : "reservations"}
                </span>
                {u.id === meId || u.is_admin ? (
                  <span className="text-xs text-park-muted">—</span>
                ) : (
                  <DeleteButton onClick={() => setTarget(u)} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(o) => !o && setTarget(null)}
        title={`Delete ${target?.username ?? "user"}?`}
        description="This permanently deletes the user and all of their reservations. This cannot be undone."
        confirmLabel="Delete user"
        destructive
        onConfirm={remove}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------- Benches
function BenchManagement({ benches }: { benches: Bench[] }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [region, setRegion] = React.useState<Region>("north");
  const [description, setDescription] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [target, setTarget] = React.useState<Bench | null>(null);

  const filtered = benches.filter((b) =>
    b.code.toLowerCase().includes(query.toLowerCase()),
  );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await adminAddBench({ code, region, description });
    setAdding(false);
    if (res.ok) {
      toast.success(`Added bench ${code.toUpperCase()}.`);
      setCode("");
      setDescription("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not add bench.");
    }
  }

  async function remove() {
    if (!target) return;
    const res = await adminDeleteBench(target.id);
    if (res.ok) {
      toast.success(`Removed bench ${target.code}.`);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not remove bench.");
    }
  }

  return (
    <Panel
      title="Bench management"
      description="Add new benches to the program or remove benches that are no longer available for adoption."
    >
      <form onSubmit={add} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 sm:w-28">
          <span className="text-xs font-semibold text-park-ink">Code</span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="N8"
            required
            className="bg-park-bg/50"
          />
        </label>
        <label className="flex flex-col gap-1 sm:w-32">
          <span className="text-xs font-semibold text-park-ink">Region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
            className="h-9 rounded-md border border-park-border bg-park-bg/50 px-2 text-sm"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {REGION_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-park-ink">Location</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="North Meadow"
            className="bg-park-bg/50"
          />
        </label>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-park-green px-4 text-sm font-bold text-white hover:bg-park-green/90 disabled:opacity-60"
        >
          {adding && <Loader2 className="size-4 animate-spin" />}
          Add bench
        </button>
      </form>

      <Input
        placeholder="Search benches by code"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 bg-park-bg/50"
      />
      <div className="max-h-64 overflow-auto rounded-xl border border-park-border">
        {filtered.slice(0, 50).map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 border-b border-park-border px-4 py-2.5 last:border-b-0"
          >
            <span className="font-semibold text-park-ink">Bench {b.code}</span>
            <span className="hidden text-sm text-park-muted sm:block">
              {b.description ?? REGION_LABEL[b.region]}
            </span>
            <DeleteButton onClick={() => setTarget(b)} />
          </div>
        ))}
        {filtered.length > 50 && (
          <p className="px-4 py-2 text-xs text-park-muted">
            Showing first 50 of {filtered.length}. Refine your search.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(o) => !o && setTarget(null)}
        title={`Remove bench ${target?.code ?? ""}?`}
        description="The bench will no longer be available for adoption. Existing reservations are removed too."
        confirmLabel="Remove bench"
        destructive
        onConfirm={remove}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------- Reservations
function ReservationManagement({
  reservations,
}: {
  reservations: AdminReservationRow[];
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"all" | "active" | "cancelled">(
    "all",
  );
  const [benchQ, setBenchQ] = React.useState("");
  const [userQ, setUserQ] = React.useState("");
  const [target, setTarget] = React.useState<AdminReservationRow | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [batchConfirmOpen, setBatchConfirmOpen] = React.useState(false);
  const [batchDeleting, setBatchDeleting] = React.useState(false);

  const filtered = reservations.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (benchQ && !r.bench_code.toLowerCase().includes(benchQ.toLowerCase()))
      return false;
    if (userQ && !r.username.toLowerCase().includes(userQ.toLowerCase()))
      return false;
    return true;
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filtered) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filtered) next.add(r.id);
        return next;
      });
    }
  }

  async function remove() {
    if (!target) return;
    const res = await adminDeleteReservation(target.id);
    if (res.ok) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      toast.success("Reservation deleted.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete reservation.");
    }
  }

  async function batchRemove() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const res = await adminBatchDeleteReservations(ids);
    setBatchDeleting(false);
    setBatchConfirmOpen(false);
    if (res.ok) {
      toast.success(`Deleted ${res.deletedCount} reservation${res.deletedCount === 1 ? "" : "s"}.`);
      setSelected(new Set());
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete reservations.");
    }
  }

  return (
    <Panel title="Reservation management">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "all" | "active" | "cancelled")
          }
          className="h-9 rounded-md border border-park-border bg-park-bg/50 px-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Input
          placeholder="Bench code"
          value={benchQ}
          onChange={(e) => setBenchQ(e.target.value)}
          className="h-9 w-32 bg-park-bg/50"
        />
        <Input
          placeholder="Username"
          value={userQ}
          onChange={(e) => setUserQ(e.target.value)}
          className="h-9 w-40 bg-park-bg/50"
        />
        {selected.size > 0 && (
          <button
            onClick={() => setBatchConfirmOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90"
          >
            <Trash2 className="size-3.5" />
            Delete {selected.size} selected
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-auto rounded-xl border border-park-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-park-muted">No reservations found.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-park-border bg-park-sage/30 px-4 py-2">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAll}
                className="size-4 accent-park-green"
              />
              <span className="text-xs font-semibold text-park-muted">
                Select all ({filtered.length})
              </span>
            </div>
            {filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border-b border-park-border px-4 py-3 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  className="size-4 shrink-0 accent-park-green"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-park-ink">
                    Bench {r.bench_code}
                    <span
                      className={cn(
                        "ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        r.status === "cancelled"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-park-sage text-park-green",
                      )}
                    >
                      {r.status}
                    </span>
                  </p>
                  <p className="truncate text-sm text-park-muted">
                    {r.username} · {formatRangeCompact(r.start_month, r.end_month)}
                  </p>
                </div>
                <DeleteButton onClick={() => setTarget(r)} />
              </div>
            ))}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Delete reservation?"
        description="This hard-deletes the reservation. This cannot be undone."
        confirmLabel="Delete reservation"
        destructive
        onConfirm={remove}
      />

      <ConfirmDialog
        open={batchConfirmOpen}
        onOpenChange={(o) => !o && setBatchConfirmOpen(false)}
        title={`Delete ${selected.size} reservation${selected.size === 1 ? "" : "s"}?`}
        description="This hard-deletes all selected reservations. This cannot be undone."
        confirmLabel={batchDeleting ? "Deleting…" : `Delete ${selected.size} reservation${selected.size === 1 ? "" : "s"}`}
        destructive
        onConfirm={batchRemove}
      />
    </Panel>
  );
}

// ---------------------------------------------------------------- Create
function CreateReservationPanel({
  users,
  benches,
}: {
  users: AdminUserRow[];
  benches: Bench[];
}) {
  const router = useRouter();
  const year = currentYearNY();
  const monthOptions = React.useMemo(() => {
    const now = monthIndex(monthKey(year, new Date().getMonth() + 1));
    return windowMonths(year).filter((m) => monthIndex(m) >= now);
  }, [year]);

  const [userQ, setUserQ] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [benchQ, setBenchQ] = React.useState("");
  const [benchId, setBenchId] = React.useState("");
  const [start, setStart] = React.useState<Month>(monthOptions[0] ?? "");
  const [end, setEnd] = React.useState<Month>(monthOptions[0] ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  const userMatches = userQ
    ? users
        .filter(
          (u) =>
            u.username.toLowerCase().includes(userQ.toLowerCase()) ||
            u.email.toLowerCase().includes(userQ.toLowerCase()),
        )
        .slice(0, 5)
    : [];
  const benchMatches = benchQ
    ? benches
        .filter((b) => b.code.toLowerCase().includes(benchQ.toLowerCase()))
        .slice(0, 5)
    : [];

  const count =
    start && end ? monthIndex(end) - monthIndex(start) + 1 : 0;
  const validRange = count >= 1 && count <= 12;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !benchId) {
      toast.error("Pick a user and a bench.");
      return;
    }
    if (!validRange) {
      toast.error("Choose a valid range of 1–12 consecutive months.");
      return;
    }
    setSubmitting(true);
    const res = await adminCreateReservation({
      userId,
      benchId,
      startMonth: start,
      endMonth: end,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Reservation created.");
      setUserId("");
      setUserQ("");
      setBenchId("");
      setBenchQ("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not create reservation.");
    }
  }

  const selectedUser = users.find((u) => u.id === userId);
  const selectedBench = benches.find((b) => b.id === benchId);

  return (
    <section className="h-fit rounded-2xl border border-park-border bg-park-surface p-5">
      <h2 className="text-lg font-bold text-park-green">Create a reservation</h2>
      <p className="mb-4 mt-0.5 text-sm text-park-muted">
        Link a reservation to an existing donor account.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Picker
          label="User"
          value={
            selectedUser
              ? `${selectedUser.username} — ${selectedUser.email}`
              : userQ
          }
          onChange={(v) => {
            setUserQ(v);
            setUserId("");
          }}
          matches={userMatches.map((u) => ({
            id: u.id,
            label: `${u.username} — ${u.email}`,
          }))}
          onPick={(id, label) => {
            setUserId(id);
            setUserQ(label);
          }}
          placeholder="Search by username"
        />
        <Picker
          label="Bench"
          value={
            selectedBench
              ? `${selectedBench.code}${selectedBench.description ? ` — ${selectedBench.description}` : ""}`
              : benchQ
          }
          onChange={(v) => {
            setBenchQ(v);
            setBenchId("");
          }}
          matches={benchMatches.map((b) => ({
            id: b.id,
            label: `${b.code}${b.description ? ` — ${b.description}` : ""}`,
          }))}
          onPick={(id, label) => {
            setBenchId(id);
            setBenchQ(label);
          }}
          placeholder="Search by code"
        />

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-park-ink">Start month</span>
          <MonthSelect value={start} onChange={setStart} options={monthOptions} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-park-ink">End month</span>
          <MonthSelect value={end} onChange={setEnd} options={monthOptions} />
        </label>

        <p
          className={cn(
            "text-xs",
            validRange ? "text-park-muted" : "text-destructive",
          )}
        >
          {count > 0
            ? `${count} consecutive ${count === 1 ? "month" : "months"} · within the 12-month limit`
            : "Choose a start and end month."}
          {!validRange && count > 12 && " — max is 12 months."}
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-park-green px-5 text-sm font-bold text-white hover:bg-park-green/90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Create reservation
        </button>
      </form>
    </section>
  );
}

function Picker({
  label,
  value,
  onChange,
  matches,
  onPick,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  matches: { id: string; label: string }[];
  onPick: (id: string, label: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label className="relative flex flex-col gap-1">
      <span className="text-xs font-semibold text-park-ink">{label}</span>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        className="bg-park-bg/50"
      />
      {focused && matches.length > 0 && (
        <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border border-park-border bg-park-surface shadow-lg">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id, m.label)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-park-sage/50"
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function MonthSelect({
  value,
  onChange,
  options,
}: {
  value: Month;
  onChange: (m: Month) => void;
  options: Month[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Month)}
      className="h-9 rounded-md border border-park-border bg-park-bg/50 px-2 text-sm"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {formatMonthLabel(m)}
        </option>
      ))}
    </select>
  );
}
