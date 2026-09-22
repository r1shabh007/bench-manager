"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, XCircle, Lock, Unlock, Pencil, Move } from "lucide-react";
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
  adminBatchCancelReservations,
  adminBatchDeleteBenches,
  adminBatchDeleteReservations,
  adminBatchRestrictBenches,
  adminBatchUnrestrictBenches,
  adminCancelReservation,
  adminCreateReservation,
  adminDeleteBench,
  adminDeleteReservation,
  adminDeleteUser,
  adminUpdateBench,
  adminUpdateBenchCoordinates,
} from "@/app/actions/admin";
import { AdminBenchMap } from "./admin-bench-map";

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
  const router = useRouter();
  const [selectedBenchIds, setSelectedBenchIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [mapMoveId, setMapMoveId] = React.useState<string | null>(null);

  function toggleBenchSelect(id: string, multi: boolean) {
    setSelectedBenchIds((prev) => {
      const next = new Set(multi ? prev : []);
      if (prev.has(id) && (multi || prev.size === 1)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleStartMove(benchId: string) {
    setSelectedBenchIds(new Set([benchId]));
    setMapMoveId(benchId);
  }

  async function handleEditBench(
    benchId: string,
    updates: { code?: string; region?: Region },
  ) {
    const res = await adminUpdateBench(benchId, updates);
    if (res.ok) {
      toast.success("Bench updated.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not update bench.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-10">
      <p className="text-xs font-bold uppercase tracking-wide text-park-rust">
        Authenticated admin workspace
      </p>
      <h1 className="mb-1 font-serif text-4xl text-park-green">
        Program administration
      </h1>
      <p className="mb-6 text-sm text-park-muted">
        {me.email} · Predefined administrator account
      </p>

      {/* User management — full width */}
      <UserManagement users={users} meId={me.id} />

      {/* Reservation management + Create reservation — side by side */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ReservationManagement reservations={reservations} />
        <CreateReservationPanel users={users} benches={benches} />
      </div>

      {/* Bench management + Map — side by side */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BenchManagement
          benches={benches}
          selectedIds={selectedBenchIds}
          onToggleSelect={toggleBenchSelect}
          onSetSelected={setSelectedBenchIds}
          onStartMove={handleStartMove}
          onEditBench={handleEditBench}
        />
        <AdminBenchMapSection
          benches={benches}
          selectedIds={selectedBenchIds}
          onToggleSelect={toggleBenchSelect}
          onSetSelected={setSelectedBenchIds}
          externalMoveId={mapMoveId}
          onClearExternalMove={() => setMapMoveId(null)}
        />
      </div>
    </div>
  );
}

function AdminBenchMapSection({
  benches,
  selectedIds,
  onToggleSelect,
  onSetSelected,
  externalMoveId,
  onClearExternalMove,
}: {
  benches: Bench[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, multi: boolean) => void;
  onSetSelected: (ids: Set<string>) => void;
  externalMoveId: string | null;
  onClearExternalMove: () => void;
}) {
  const router = useRouter();
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [batchRestrictOpen, setBatchRestrictOpen] = React.useState(false);
  const [batchUnrestrictOpen, setBatchUnrestrictOpen] = React.useState(false);
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);

  async function handleUpdateCoordinates(
    id: string,
    lat: number,
    lng: number,
  ): Promise<boolean> {
    const res = await adminUpdateBenchCoordinates(id, lat, lng);
    if (res.ok) {
      toast.success("Coordinates updated.");
      router.refresh();
      return true;
    }
    toast.error(res.error ?? "Could not update coordinates.");
    return false;
  }

  async function handleBatchRestrict() {
    if (pendingIds.length === 0) return;
    const res = await adminBatchRestrictBenches(pendingIds);
    setBatchRestrictOpen(false);
    if (res.ok) {
      toast.success(`Restricted ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}.`);
      onSetSelected(new Set());
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not restrict benches.");
    }
  }

  async function handleBatchUnrestrict() {
    if (pendingIds.length === 0) return;
    const res = await adminBatchUnrestrictBenches(pendingIds);
    setBatchUnrestrictOpen(false);
    if (res.ok) {
      toast.success(`Unrestricted ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}.`);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not unrestrict benches.");
    }
  }

  async function handleBatchDelete() {
    if (pendingIds.length === 0) return;
    const res = await adminBatchDeleteBenches(pendingIds);
    setBatchDeleteOpen(false);
    if (res.ok) {
      toast.success(`Deleted ${res.deletedCount} bench${res.deletedCount === 1 ? "" : "es"}.`);
      onSetSelected(new Set());
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete benches.");
    }
  }

  return (
    <Panel title="Map">
      <AdminBenchMap
        benches={benches}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onUpdateCoordinates={handleUpdateCoordinates}
        externalMoveId={externalMoveId}
        onClearExternalMove={onClearExternalMove}
        onBatchRestrict={(ids) => {
          setPendingIds(ids);
          setBatchRestrictOpen(true);
        }}
        onBatchUnrestrict={(ids) => {
          setPendingIds(ids);
          setBatchUnrestrictOpen(true);
        }}
        onBatchDelete={(ids) => {
          setPendingIds(ids);
          setBatchDeleteOpen(true);
        }}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(o) => !o && setBatchDeleteOpen(false)}
        title={`Delete ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}?`}
        description="This permanently removes the selected benches and their reservations."
        confirmLabel={`Delete ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}`}
        destructive
        onConfirm={handleBatchDelete}
      />
      <ConfirmDialog
        open={batchRestrictOpen}
        onOpenChange={(o) => !o && setBatchRestrictOpen(false)}
        title={`Restrict ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}?`}
        description="Restricted benches will appear as unavailable to the public."
        confirmLabel={`Restrict ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}`}
        destructive
        onConfirm={handleBatchRestrict}
      />
      <ConfirmDialog
        open={batchUnrestrictOpen}
        onOpenChange={(o) => !o && setBatchUnrestrictOpen(false)}
        title={`Unrestrict ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}?`}
        description="These benches will become available for adoption again."
        confirmLabel={`Unrestrict ${pendingIds.length} bench${pendingIds.length === 1 ? "" : "es"}`}
        onConfirm={handleBatchUnrestrict}
      />
    </Panel>
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

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/20"
    >
      <XCircle className="size-3.5" /> Cancel
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
      <div className="max-h-64 overflow-auto rounded-xl border border-park-border">
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
function BenchManagement({
  benches,
  selectedIds,
  onToggleSelect,
  onSetSelected,
  onStartMove,
  onEditBench,
}: {
  benches: Bench[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, multi: boolean) => void;
  onSetSelected: (ids: Set<string>) => void;
  onStartMove: (benchId: string) => void;
  onEditBench: (benchId: string, updates: { code?: string; region?: Region }) => Promise<void>;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [region, setRegion] = React.useState<Region>("north");
  const [description, setDescription] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState<Region | "all">("all");
  const [showSelectedOnly, setShowSelectedOnly] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Bench | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [batchRestrictOpen, setBatchRestrictOpen] = React.useState(false);
  const [batchUnrestrictOpen, setBatchUnrestrictOpen] = React.useState(false);
  const [editingBenchId, setEditingBenchId] = React.useState<string | null>(null);
  const [editCode, setEditCode] = React.useState("");
  const [editRegion, setEditRegion] = React.useState<Region>("north");
  const [editSaving, setEditSaving] = React.useState(false);

  const singleSelected = selectedIds.size === 1
    ? benches.find((b) => b.id === Array.from(selectedIds)[0]) ?? null
    : null;

  const filtered = benches.filter((b) => {
    if (showSelectedOnly && !selectedIds.has(b.id)) return false;
    if (regionFilter !== "all" && b.region !== regionFilter) return false;
    if (query && !b.code.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((b) => selectedIds.has(b.id));

  const selectedRestrictedCount = benches.filter(
    (b) => selectedIds.has(b.id) && b.restricted,
  ).length;
  const selectedUnrestrictedCount = benches.filter(
    (b) => selectedIds.has(b.id) && !b.restricted,
  ).length;

  function toggleAll() {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      for (const b of filtered) next.delete(b.id);
      onSetSelected(next);
    } else {
      const next = new Set(selectedIds);
      for (const b of filtered) next.add(b.id);
      onSetSelected(next);
    }
  }

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

  async function removeSingle() {
    if (!deleteTarget) return;
    const res = await adminDeleteBench(deleteTarget.id);
    if (res.ok) {
      toast.success(`Removed bench ${deleteTarget.code}.`);
      const next = new Set(selectedIds);
      next.delete(deleteTarget.id);
      onSetSelected(next);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not remove bench.");
    }
  }

  async function batchDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const res = await adminBatchDeleteBenches(ids);
    setBatchDeleteOpen(false);
    if (res.ok) {
      toast.success(
        `Deleted ${res.deletedCount} bench${res.deletedCount === 1 ? "" : "es"}.`,
      );
      onSetSelected(new Set());
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete benches.");
    }
  }

  async function batchRestrict() {
    const ids = benches
      .filter((b) => selectedIds.has(b.id) && !b.restricted)
      .map((b) => b.id);
    if (ids.length === 0) return;
    const res = await adminBatchRestrictBenches(ids);
    setBatchRestrictOpen(false);
    if (res.ok) {
      toast.success(`Restricted ${ids.length} bench${ids.length === 1 ? "" : "es"}.`);
      onSetSelected(new Set());
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not restrict benches.");
    }
  }

  async function batchUnrestrict() {
    const ids = benches
      .filter((b) => selectedIds.has(b.id) && b.restricted)
      .map((b) => b.id);
    if (ids.length === 0) return;
    const res = await adminBatchUnrestrictBenches(ids);
    setBatchUnrestrictOpen(false);
    if (res.ok) {
      toast.success(
        `Unrestricted ${ids.length} bench${ids.length === 1 ? "" : "es"}.`,
      );
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not unrestrict benches.");
    }
  }

  return (
    <Panel
      title="Bench management"
      description="Add, restrict, or remove benches from the program."
    >
      {/* Add form */}
      <form
        onSubmit={add}
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
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

      {/* Search + filter + batch actions */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search benches by code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-44 bg-park-bg/50"
        />
        <label className="flex items-center gap-1.5 text-xs text-park-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showSelectedOnly}
            onChange={(e) => setShowSelectedOnly(e.target.checked)}
            className="size-3.5 accent-park-green"
          />
          Show selected ({selectedIds.size})
        </label>
        {selectedIds.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selectedUnrestrictedCount > 0 && (
              <button
                onClick={() => setBatchRestrictOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
              >
                <Lock className="size-3.5" />
                Restrict {selectedUnrestrictedCount}
              </button>
            )}
            {selectedRestrictedCount > 0 && (
              <button
                onClick={() => setBatchUnrestrictOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-park-green/10 px-3 py-1.5 text-xs font-bold text-park-green transition-colors hover:bg-park-green/20"
              >
                <Unlock className="size-3.5" />
                Unrestrict {selectedRestrictedCount}
              </button>
            )}
            <button
              onClick={() => setBatchDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90"
            >
              <Trash2 className="size-3.5" />
              Delete {selectedIds.size}
            </button>
          </div>
        )}
      </div>

      {/* Inline edit form */}
      {singleSelected && editingBenchId === singleSelected.id && (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-bold text-park-ink">
            Edit — Bench {singleSelected.code}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-park-ink">Code</span>
              <Input
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="h-8 w-24 bg-white"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-park-ink">Region</span>
              <select
                value={editRegion}
                onChange={(e) => setEditRegion(e.target.value as Region)}
                className="h-8 rounded-md border border-park-border bg-white px-2 text-sm"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={async () => {
                setEditSaving(true);
                await onEditBench(singleSelected.id, {
                  code: editCode,
                  region: editRegion,
                });
                setEditSaving(false);
                setEditingBenchId(null);
              }}
              disabled={editSaving}
              className="h-8 rounded-md bg-park-green px-4 text-xs font-bold text-white hover:bg-park-green/90 disabled:opacity-60"
            >
              {editSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditingBenchId(null)}
              className="h-8 rounded-md border border-park-border px-4 text-xs font-bold text-park-muted hover:bg-park-sage/30"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bench list with checkboxes */}
      <div className="min-h-[320px] max-h-[320px] overflow-auto rounded-xl border border-park-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-park-muted">No benches found.</p>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-park-border bg-park-sage/30 px-4 py-2">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAll}
                className="size-4 accent-park-green"
              />
              <span className="flex-1 text-xs font-semibold text-park-muted">
                Select all ({filtered.length})
              </span>
              {singleSelected && editingBenchId !== singleSelected.id && (
                <>
                  <button
                    onClick={() => {
                      setEditingBenchId(singleSelected.id);
                      setEditCode(singleSelected.code);
                      setEditRegion(singleSelected.region);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-park-green/10 px-2 py-1 text-xs font-bold text-park-green transition-colors hover:bg-park-green/20"
                  >
                    <Pencil className="size-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => onStartMove(singleSelected.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-park-green/10 px-2 py-1 text-xs font-bold text-park-green transition-colors hover:bg-park-green/20"
                  >
                    <Move className="size-3" />
                    Move
                  </button>
                </>
              )}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as Region | "all")}
                className="hidden h-7 rounded-md border border-park-border bg-park-bg/50 px-2 text-xs text-park-muted sm:block"
              >
                <option value="all">All regions</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABEL[r]}
                  </option>
                ))}
              </select>
              <span className="hidden w-[68px] sm:block" />
            </div>
            {filtered.slice(0, 80).map((b) => (
              <div
                key={b.id}
                className={cn(
                  "flex items-center gap-3 border-b border-park-border px-4 py-2.5 last:border-b-0",
                  selectedIds.has(b.id) && "bg-amber-50/50",
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(b.id)}
                  onChange={() => onToggleSelect(b.id, true)}
                  className="size-4 shrink-0 accent-park-green"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-park-ink">
                    Bench {b.code}
                  </span>
                  {b.restricted && (
                    <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
                      Restricted
                    </span>
                  )}
                </div>
                <span className="hidden text-sm text-park-muted sm:block">
                  {REGION_LABEL[b.region]}
                </span>
                <DeleteButton onClick={() => setDeleteTarget(b)} />
              </div>
            ))}
            {filtered.length > 80 && (
              <p className="px-4 py-2 text-xs text-park-muted">
                Showing first 80 of {filtered.length}. Refine your search.
              </p>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Remove bench ${deleteTarget?.code ?? ""}?`}
        description="The bench will no longer be available for adoption. Existing reservations are removed too."
        confirmLabel="Remove bench"
        destructive
        onConfirm={removeSingle}
      />
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(o) => !o && setBatchDeleteOpen(false)}
        title={`Delete ${selectedIds.size} bench${selectedIds.size === 1 ? "" : "es"}?`}
        description="This permanently removes the selected benches and their reservations."
        confirmLabel={`Delete ${selectedIds.size} bench${selectedIds.size === 1 ? "" : "es"}`}
        destructive
        onConfirm={batchDelete}
      />
      <ConfirmDialog
        open={batchRestrictOpen}
        onOpenChange={(o) => !o && setBatchRestrictOpen(false)}
        title={`Restrict ${selectedUnrestrictedCount} bench${selectedUnrestrictedCount === 1 ? "" : "es"}?`}
        description="Restricted benches will appear as unavailable to the public."
        confirmLabel={`Restrict ${selectedUnrestrictedCount} bench${selectedUnrestrictedCount === 1 ? "" : "es"}`}
        destructive
        onConfirm={batchRestrict}
      />
      <ConfirmDialog
        open={batchUnrestrictOpen}
        onOpenChange={(o) => !o && setBatchUnrestrictOpen(false)}
        title={`Unrestrict ${selectedRestrictedCount} bench${selectedRestrictedCount === 1 ? "" : "es"}?`}
        description="These benches will become available for adoption again."
        confirmLabel={`Unrestrict ${selectedRestrictedCount} bench${selectedRestrictedCount === 1 ? "" : "es"}`}
        onConfirm={batchUnrestrict}
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
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] =
    React.useState<AdminReservationRow | null>(null);
  const [cancelTarget, setCancelTarget] =
    React.useState<AdminReservationRow | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [batchCancelOpen, setBatchCancelOpen] = React.useState(false);
  const [batchDeleting, setBatchDeleting] = React.useState(false);
  const [batchCancelling, setBatchCancelling] = React.useState(false);

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

  const selectedActiveCount = reservations.filter(
    (r) => selected.has(r.id) && r.status === "active",
  ).length;

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

  async function removeSingle() {
    if (!deleteTarget) return;
    const res = await adminDeleteReservation(deleteTarget.id);
    if (res.ok) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      toast.success("Reservation deleted.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete reservation.");
    }
  }

  async function cancelSingle() {
    if (!cancelTarget) return;
    const res = await adminCancelReservation(cancelTarget.id);
    if (res.ok) {
      toast.success("Reservation cancelled.");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not cancel reservation.");
    }
  }

  async function batchRemove() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const res = await adminBatchDeleteReservations(ids);
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    if (res.ok) {
      toast.success(
        `Deleted ${res.deletedCount} reservation${res.deletedCount === 1 ? "" : "s"}.`,
      );
      setSelected(new Set());
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete reservations.");
    }
  }

  async function batchCancel() {
    const ids = reservations
      .filter((r) => selected.has(r.id) && r.status === "active")
      .map((r) => r.id);
    if (ids.length === 0) return;
    setBatchCancelling(true);
    const res = await adminBatchCancelReservations(ids);
    setBatchCancelling(false);
    setBatchCancelOpen(false);
    if (res.ok) {
      toast.success(
        `Cancelled ${res.cancelledCount} reservation${res.cancelledCount === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not cancel reservations.");
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
          <div className="ml-auto flex items-center gap-2">
            {selectedActiveCount > 0 && (
              <button
                onClick={() => setBatchCancelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-600"
              >
                <XCircle className="size-3.5" />
                Cancel {selectedActiveCount} active
              </button>
            )}
            <button
              onClick={() => setBatchDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90"
            >
              <Trash2 className="size-3.5" />
              Delete {selected.size} selected
            </button>
          </div>
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
                    {r.username} ·{" "}
                    {formatRangeCompact(r.start_month, r.end_month)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {r.status === "active" && (
                    <CancelButton onClick={() => setCancelTarget(r)} />
                  )}
                  <DeleteButton onClick={() => setDeleteTarget(r)} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete reservation?"
        description="This hard-deletes the reservation. This cannot be undone."
        confirmLabel="Delete reservation"
        destructive
        onConfirm={removeSingle}
      />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel reservation?"
        description="This marks the reservation as cancelled. The bench will become available for others."
        confirmLabel="Cancel reservation"
        destructive
        onConfirm={cancelSingle}
      />
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(o) => !o && setBatchDeleteOpen(false)}
        title={`Delete ${selected.size} reservation${selected.size === 1 ? "" : "s"}?`}
        description="This hard-deletes all selected reservations. This cannot be undone."
        confirmLabel={
          batchDeleting
            ? "Deleting…"
            : `Delete ${selected.size} reservation${selected.size === 1 ? "" : "s"}`
        }
        destructive
        onConfirm={batchRemove}
      />
      <ConfirmDialog
        open={batchCancelOpen}
        onOpenChange={(o) => !o && setBatchCancelOpen(false)}
        title={`Cancel ${selectedActiveCount} active reservation${selectedActiveCount === 1 ? "" : "s"}?`}
        description="This marks the selected active reservations as cancelled. Their benches will become available for others."
        confirmLabel={
          batchCancelling
            ? "Cancelling…"
            : `Cancel ${selectedActiveCount} reservation${selectedActiveCount === 1 ? "" : "s"}`
        }
        destructive
        onConfirm={batchCancel}
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

  const count = start && end ? monthIndex(end) - monthIndex(start) + 1 : 0;
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
      <h2 className="text-lg font-bold text-park-green">
        Create a reservation
      </h2>
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
          <span className="text-xs font-semibold text-park-ink">
            Start month
          </span>
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
