"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, XCircle, X, Lock, Unlock, Pencil, Check, Move, ChevronDown } from "lucide-react";
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
  const [regionFilter, setRegionFilter] = React.useState<Record<Region, boolean>>({
    north: true,
    central: true,
    south: true,
  });
  function toggleRegion(r: Region) {
    setRegionFilter((prev) => ({ ...prev, [r]: !prev[r] }));
  }
  const prevSelectedRef = React.useRef<Set<string>>(new Set());
  function handleStartMove(benchId: string) {
    prevSelectedRef.current = new Set(selectedBenchIds);
    setSelectedBenchIds(new Set([benchId]));
    setMapMoveId(benchId);
  }

  function handleMoveComplete() {
    setMapMoveId(null);
    setSelectedBenchIds(prevSelectedRef.current);
  }

  function guardedSetSelected(ids: Set<string>) {
    if (mapMoveId) {
      toast.show("Confirm or cancel the move first.");
      return;
    }
    setSelectedBenchIds(ids);
  }

  function toggleBenchSelect(id: string, multi: boolean) {
    if (mapMoveId) {
      toast.show("Confirm or cancel the move first.");
      return;
    }
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

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-5 py-8 sm:px-10">
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
          onSetSelected={guardedSetSelected}
          movingBenchId={mapMoveId}
          onStartMove={handleStartMove}
          onMoveComplete={handleMoveComplete}
          regionFilter={regionFilter}
          onToggleRegion={toggleRegion}
          onSetRegionFilter={setRegionFilter}
        />
        <AdminBenchMapSection
          benches={benches}
          selectedIds={selectedBenchIds}
          onToggleSelect={toggleBenchSelect}
          onSetSelected={guardedSetSelected}
          externalMoveId={mapMoveId}
          onStartMove={handleStartMove}
          onMoveComplete={handleMoveComplete}
          regionFilter={regionFilter}
          onToggleRegion={toggleRegion}
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
  onStartMove,
  onMoveComplete,
  regionFilter,
  onToggleRegion,
}: {
  benches: Bench[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, multi: boolean) => void;
  onSetSelected: (ids: Set<string>) => void;
  externalMoveId: string | null;
  onStartMove: (benchId: string) => void;
  onMoveComplete: () => void;
  regionFilter: Record<Region, boolean>;
  onToggleRegion: (r: Region) => void;
}) {
  const router = useRouter();
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [batchRestrictOpen, setBatchRestrictOpen] = React.useState(false);
  const [batchUnrestrictOpen, setBatchUnrestrictOpen] = React.useState(false);
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);

  async function handleUpdateBench(
    id: string,
    updates: { code?: string; region?: Region },
  ): Promise<boolean> {
    const res = await adminUpdateBench(id, updates);
    if (res.ok) {
      toast.success("Updated.");
      router.refresh();
      return true;
    }
    toast.error(res.error ?? "Could not update bench.");
    return false;
  }

  async function handleUpdateCoordinates(
    id: string,
    lat: number,
    lng: number,
  ): Promise<boolean> {
    const res = await adminUpdateBenchCoordinates(id, lat, lng);
    if (res.ok) {
      toast.success("Coordinates updated.");
      router.refresh();
      if (externalMoveId === id) onMoveComplete();
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

  const filteredBenches = benches.filter((b) => regionFilter[b.region]);

  return (
    <Panel title="Map">
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by park area">
        {REGIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onToggleRegion(r)}
            aria-pressed={regionFilter[r]}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              regionFilter[r]
                ? "border-park-green bg-park-green text-white"
                : "border-park-border bg-park-surface text-park-muted hover:border-park-green hover:text-park-green",
            )}
          >
            {REGION_LABEL[r]}
          </button>
        ))}
      </div>
      <AdminBenchMap
        benches={filteredBenches}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onUpdateCoordinates={handleUpdateCoordinates}
        onUpdateBench={handleUpdateBench}
        onDeselect={() => onSetSelected(new Set())}
        externalMoveId={externalMoveId}
        onCancelExternalMove={onMoveComplete}
        onStartMove={onStartMove}
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
    <section className="overflow-hidden rounded-2xl border border-park-border bg-park-surface p-5">
      <h2 className="text-lg font-bold text-park-green">{title}</h2>
      {description && (
        <p className="mb-3 mt-0.5 text-sm text-park-muted">{description}</p>
      )}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function DeleteButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
        disabled
          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
          : "bg-destructive/10 text-destructive hover:bg-destructive/20",
      )}
    >
      <Trash2 className="size-3 sm:size-3.5" /> Delete
    </button>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-500/20 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
    >
      <XCircle className="size-3 sm:size-3.5" /> Cancel
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

  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
    );
  });

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
        placeholder="Search by name, username, or email"
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
                  {u.first_name && u.last_name
                    ? `${u.first_name} ${u.last_name}`
                    : u.username}
                  {u.is_admin && (
                    <span className="ml-2 inline-block align-middle rounded bg-park-sage px-1.5 py-0.5 text-[10px] font-bold uppercase text-park-green">
                      Admin
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-park-muted">
                  {u.username} · {u.email}
                </p>
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
  movingBenchId,
  onStartMove,
  onMoveComplete,
  regionFilter,
  onToggleRegion,
  onSetRegionFilter,
}: {
  benches: Bench[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, multi: boolean) => void;
  onSetSelected: (ids: Set<string>) => void;
  movingBenchId: string | null;
  onStartMove: (benchId: string) => void;
  onMoveComplete: () => void;
  regionFilter: Record<Region, boolean>;
  onToggleRegion: (r: Region) => void;
  onSetRegionFilter: (v: Record<Region, boolean>) => void;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [region, setRegion] = React.useState<Region>("north");
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [regionDropdownOpen, setRegionDropdownOpen] = React.useState(false);
  const regionDropdownRef = React.useRef<HTMLDivElement>(null);
  const [showSelectedOnly, setShowSelectedOnly] = React.useState(false);

  React.useEffect(() => {
    if (!regionDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target as Node)) {
        setRegionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [regionDropdownOpen]);
  const [deleteTarget, setDeleteTarget] = React.useState<Bench | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [batchRestrictOpen, setBatchRestrictOpen] = React.useState(false);
  const [batchUnrestrictOpen, setBatchUnrestrictOpen] = React.useState(false);
  const [moveLat, setMoveLat] = React.useState("");
  const [moveLng, setMoveLng] = React.useState("");
  const [moveSaving, setMoveSaving] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!movingBenchId) return;
    const bench = benches.find((b) => b.id === movingBenchId);
    if (bench) {
      setMoveLat(bench.latitude.toFixed(9));
      setMoveLng(bench.longitude.toFixed(9));
    }
    requestAnimationFrame(() => {
      const container = listRef.current;
      if (!container) return;
      const row = container.querySelector(`[data-bench-id="${movingBenchId}"]`) as HTMLElement | null;
      if (row) {
        const containerRect = container.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const stickyHeader = container.querySelector(".sticky") as HTMLElement | null;
        const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;
        container.scrollTop += rowRect.top - containerRect.top - headerHeight;
      }
    });
  }, [movingBenchId]);

  async function saveMove() {
    if (!movingBenchId) return;
    const parsedLat = parseFloat(moveLat);
    const parsedLng = parseFloat(moveLng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      toast.error("Enter valid coordinates.");
      return;
    }
    setMoveSaving(true);
    const res = await adminUpdateBenchCoordinates(movingBenchId, parsedLat, parsedLng);
    setMoveSaving(false);
    if (res.ok) {
      toast.success("Coordinates updated.");
      onMoveComplete();
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not update coordinates.");
    }
  }

  const filtered = benches.filter((b) => {
    if (showSelectedOnly && !selectedIds.has(b.id)) return false;
    if (!regionFilter[b.region]) return false;
    if (query && !b.code.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((b) => selectedIds.has(b.id));

  const [editingCodeId, setEditingCodeId] = React.useState<string | null>(null);
  const [editCode, setEditCode] = React.useState("");
  const [editingRegionId, setEditingRegionId] = React.useState<string | null>(null);
  const [editRegion, setEditRegion] = React.useState<Region>("north");
  const [editSaving, setEditSaving] = React.useState(false);

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
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    const res = await adminAddBench({ code, region, latitude: parsedLat, longitude: parsedLng });
    setAdding(false);
    if (res.ok) {
      toast.success(`Added bench ${code.toUpperCase()}.`);
      setCode("");
      setLat("");
      setLng("");
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

  async function saveCode(benchId: string) {
    setEditSaving(true);
    const res = await adminUpdateBench(benchId, { code: editCode });
    setEditSaving(false);
    if (res.ok) {
      toast.success("Code updated.");
      setEditingCodeId(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not update code.");
    }
  }

  async function saveRegion(benchId: string) {
    setEditSaving(true);
    const res = await adminUpdateBench(benchId, { region: editRegion });
    setEditSaving(false);
    if (res.ok) {
      toast.success("Region updated.");
      setEditingRegionId(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not update region.");
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
        className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:gap-3"
      >
        <label className="flex flex-col gap-0.5 sm:w-28 sm:gap-1">
          <span className="text-[10px] font-semibold text-park-ink sm:text-xs">Code</span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="N8"
            required
            className="h-7 bg-park-bg/50 text-xs sm:h-9 sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-0.5 sm:w-32 sm:gap-1">
          <span className="text-[10px] font-semibold text-park-ink sm:text-xs">Region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
            className="h-7 rounded-md border border-park-border bg-park-bg/50 px-1.5 text-xs sm:h-9 sm:px-2 sm:text-sm"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {REGION_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 sm:w-32 sm:gap-1">
          <span className="text-[10px] font-semibold text-park-ink sm:text-xs">Latitude</span>
          <Input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="40.896000000"
            className="h-7 bg-park-bg/50 text-xs sm:h-9 sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-0.5 sm:w-32 sm:gap-1">
          <span className="text-[10px] font-semibold text-park-ink sm:text-xs">Longitude</span>
          <Input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-73.886700000"
            className="h-7 bg-park-bg/50 text-xs sm:h-9 sm:text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex h-7 items-center justify-center gap-2 rounded-md bg-park-green px-3 text-xs font-bold text-white hover:bg-park-green/90 disabled:opacity-60 sm:h-9 sm:px-4 sm:text-sm"
        >
          {adding && <Loader2 className="size-3.5 animate-spin sm:size-4" />}
          Add
        </button>
      </form>

      {/* Select all + deselect + show selected + batch actions */}
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mb-3">
        <label className="flex items-center gap-1 text-[9px] text-park-muted cursor-pointer select-none sm:text-[11px]">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAll}
            className="size-2.5 accent-park-green sm:size-3"
          />
          Select all ({filtered.length})
        </label>
        <label className={cn(
          "flex items-center gap-1 text-[9px] cursor-pointer select-none sm:text-[11px]",
          selectedIds.size === 0 ? "text-park-muted/30 cursor-not-allowed" : "text-park-muted",
        )}>
          <input
            type="checkbox"
            checked={false}
            onChange={() => onSetSelected(new Set())}
            disabled={selectedIds.size === 0}
            className="size-2.5 accent-park-green sm:size-3"
          />
          Deselect
        </label>
        <label className="flex items-center gap-1 text-[9px] text-park-muted cursor-pointer select-none sm:text-[11px]">
          <input
            type="checkbox"
            checked={showSelectedOnly}
            onChange={(e) => setShowSelectedOnly(e.target.checked)}
            className="size-2.5 accent-park-green sm:size-3"
          />
          Show selected ({selectedIds.size})
        </label>
        <div className="flex items-center gap-1.5 sm:ml-auto sm:gap-2">
          <button
            onClick={() => setBatchRestrictOpen(true)}
            disabled={selectedUnrestrictedCount === 0 || !!movingBenchId}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
              selectedUnrestrictedCount === 0 || movingBenchId
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-destructive/10 text-destructive hover:bg-destructive/20",
            )}
          >
            <Lock className="size-3 sm:size-3.5" />
            Restrict {selectedUnrestrictedCount || 0}
          </button>
          <button
            onClick={() => setBatchUnrestrictOpen(true)}
            disabled={selectedRestrictedCount === 0 || !!movingBenchId}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
              selectedRestrictedCount === 0 || movingBenchId
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-park-green/10 text-park-green hover:bg-park-green/20",
            )}
          >
            <Unlock className="size-3 sm:size-3.5" />
            Unrestrict {selectedRestrictedCount || 0}
          </button>
        </div>
      </div>

      {/* Bench list with checkboxes */}
      <div ref={listRef} className="min-h-[380px] max-h-[380px] overflow-auto rounded-xl border border-park-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-park-muted">No benches found.</p>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-x-2 border-b border-park-border bg-park-sage/90 px-2 py-1.5 sm:gap-x-3 sm:px-4 sm:py-2">
              <span className="hidden shrink-0 sm:block sm:w-4" />
              <div className="min-w-0 flex-1">
                <Input
                  placeholder="Search code"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-6 w-full bg-white px-1.5 text-[10px] sm:h-7 sm:w-28 sm:px-2 sm:text-xs"
                />
              </div>
              <div ref={regionDropdownRef} className="relative w-[48px] shrink-0 sm:w-[68px]">
                <button
                  type="button"
                  onClick={() => setRegionDropdownOpen((o) => !o)}
                  className="flex h-6 w-full items-center justify-end gap-0.5 rounded-md border border-park-border bg-park-bg/50 px-1 text-[10px] text-park-muted hover:border-park-green sm:h-7 sm:gap-1 sm:px-2 sm:text-xs"
                >
                  <span className="truncate">
                    {REGIONS.every((r) => regionFilter[r])
                      ? "All"
                      : REGIONS.filter((r) => regionFilter[r]).map((r) => REGION_LABEL[r]).join(", ") || "None"}
                  </span>
                  <ChevronDown className="size-2.5 shrink-0 opacity-60 sm:size-3" />
                </button>
                {regionDropdownOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-park-border bg-white py-1 shadow-lg">
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs font-semibold text-park-ink hover:bg-park-sage/30">
                      <input
                        type="checkbox"
                        checked={REGIONS.every((r) => regionFilter[r])}
                        onChange={() => {
                          const allOn = REGIONS.every((r) => regionFilter[r]);
                          onSetRegionFilter({ north: !allOn, central: !allOn, south: !allOn });
                        }}
                        className="accent-park-green"
                      />
                      Select all
                    </label>
                    <div className="mx-2 my-0.5 border-t border-park-border" />
                    {REGIONS.map((r) => (
                      <label key={r} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-park-ink hover:bg-park-sage/30">
                        <input
                          type="checkbox"
                          checked={regionFilter[r]}
                          onChange={() => onToggleRegion(r)}
                          className="accent-park-green"
                        />
                        {REGION_LABEL[r]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <span className="w-6 shrink-0 sm:w-[72px]" />
              <div className="w-[62px] shrink-0 flex justify-end sm:w-[110px]">
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setBatchDeleteOpen(true)}
                    disabled={!!movingBenchId}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
                      movingBenchId
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : "bg-destructive text-white hover:bg-destructive/90",
                    )}
                  >
                    <Trash2 className="size-3 sm:size-3.5" />
                    <span className="hidden sm:inline">Delete</span> {selectedIds.size}
                  </button>
                )}
              </div>
            </div>
            {filtered.slice(0, 80).map((b) => (
              <div
                key={b.id}
                data-bench-id={b.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-park-border px-2 py-2 last:border-b-0 sm:gap-x-3 sm:px-4 sm:py-2.5",
                  movingBenchId === b.id
                    ? "bg-amber-100"
                    : movingBenchId
                      ? "opacity-40 pointer-events-none"
                      : selectedIds.has(b.id) && "bg-amber-50/50",
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(b.id)}
                  onChange={() => onToggleSelect(b.id, true)}
                  className="size-3.5 shrink-0 accent-park-green sm:size-4"
                  disabled={movingBenchId === b.id}
                />
                <div className="min-w-0 flex-1 flex items-center gap-1 overflow-hidden">
                  {editingCodeId === b.id ? (
                    <>
                      <span className="text-xs text-park-muted sm:text-sm">Bench</span>
                      <Input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        autoFocus
                        className="h-5 w-14 bg-white px-1 text-xs font-semibold sm:h-6 sm:w-16 sm:px-1.5 sm:text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") saveCode(b.id); if (e.key === "Escape") setEditingCodeId(null); }}
                      />
                      <button
                        onClick={() => saveCode(b.id)}
                        disabled={editSaving}
                        className="rounded p-0.5 text-park-green hover:bg-park-green/10 disabled:opacity-50"
                      >
                        {editSaving ? <Loader2 className="size-3 animate-spin sm:size-3.5" /> : <Check className="size-3 sm:size-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingCodeId(null)}
                        disabled={editSaving}
                        className="rounded p-0.5 text-destructive/60 hover:text-destructive disabled:opacity-50"
                      >
                        <X className="size-3 sm:size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-park-ink sm:text-sm">
                        Bench {b.code}
                      </span>
                      <button
                        onClick={() => { setEditingCodeId(b.id); setEditCode(b.code); setEditingRegionId(null); }}
                        disabled={movingBenchId === b.id}
                        className={cn(
                          "rounded p-0.5",
                          movingBenchId === b.id
                            ? "text-park-muted/20 cursor-not-allowed"
                            : "text-park-muted/50 hover:text-park-ink",
                        )}
                      >
                        <Pencil className="size-2.5 sm:size-3" />
                      </button>
                    </>
                  )}
                  {b.restricted && (
                    <span className="ml-1 inline-block align-middle rounded bg-destructive/10 px-1 py-0.5 text-[8px] font-bold uppercase text-destructive sm:px-1.5 sm:text-[10px]">
                      Restricted
                    </span>
                  )}
                </div>
                <div className="flex w-[48px] shrink-0 items-center gap-1 justify-end sm:w-[68px]">
                  {editingRegionId === b.id ? (
                    <>
                      <select
                        value={editRegion}
                        onChange={(e) => setEditRegion(e.target.value as Region)}
                        autoFocus
                        className="h-5 rounded-md border border-park-border bg-white px-1 text-[10px] sm:h-6 sm:text-xs"
                      >
                        {REGIONS.map((r) => (
                          <option key={r} value={r}>{REGION_LABEL[r]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveRegion(b.id)}
                        disabled={editSaving}
                        className="rounded p-0.5 text-park-green hover:bg-park-green/10 disabled:opacity-50"
                      >
                        {editSaving ? <Loader2 className="size-3 animate-spin sm:size-3.5" /> : <Check className="size-3 sm:size-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingRegionId(null)}
                        disabled={editSaving}
                        className="rounded p-0.5 text-destructive/60 hover:text-destructive disabled:opacity-50"
                      >
                        <X className="size-3 sm:size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-park-muted sm:text-sm">
                        {REGION_LABEL[b.region]}
                      </span>
                      <button
                        onClick={() => { setEditingRegionId(b.id); setEditRegion(b.region); setEditingCodeId(null); }}
                        disabled={movingBenchId === b.id}
                        className={cn(
                          "rounded p-0.5",
                          movingBenchId === b.id
                            ? "text-park-muted/20 cursor-not-allowed"
                            : "text-park-muted/50 hover:text-park-ink",
                        )}
                      >
                        <Pencil className="size-2.5 sm:size-3" />
                      </button>
                    </>
                  )}
                </div>
                {movingBenchId === b.id ? (
                  <button
                    onClick={onMoveComplete}
                    className="inline-flex w-6 shrink-0 items-center justify-center rounded-md bg-gray-500 p-1 text-[10px] font-bold text-white transition-colors hover:bg-gray-600 sm:w-[72px] sm:gap-1 sm:px-2 sm:text-xs"
                  >
                    <XCircle className="size-2.5 shrink-0 sm:size-3" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStartMove(b.id)}
                    className="inline-flex w-6 shrink-0 items-center justify-center rounded-md border border-park-border p-1 text-[10px] font-bold text-park-muted transition-colors hover:bg-park-sage/30 sm:w-[72px] sm:gap-1 sm:px-2 sm:text-xs"
                  >
                    <Move className="size-2.5 shrink-0 sm:size-3" />
                    <span className="hidden sm:inline">Move</span>
                  </button>
                )}
                <div className="w-[62px] shrink-0 flex justify-end sm:w-[110px]">
                  {movingBenchId === b.id ? (
                    <button
                      onClick={saveMove}
                      disabled={moveSaving}
                      className="inline-flex items-center gap-1.5 rounded-md bg-park-green px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-park-green/90 disabled:opacity-60"
                    >
                      {moveSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      {moveSaving ? "Saving…" : "Save"}
                    </button>
                  ) : (
                    <DeleteButton onClick={() => setDeleteTarget(b)} />
                  )}
                </div>
                {movingBenchId === b.id && (
                  <div className="flex w-full items-center justify-center gap-2">
                    <label className="flex items-center gap-1 text-xs font-semibold text-park-ink">
                      Lat
                      <Input
                        type="number"
                        step="any"
                        value={moveLat}
                        onChange={(e) => setMoveLat(e.target.value)}
                        className="h-6 w-28 bg-white px-1.5 text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs font-semibold text-park-ink">
                      Lng
                      <Input
                        type="number"
                        step="any"
                        value={moveLng}
                        onChange={(e) => setMoveLng(e.target.value)}
                        className="h-6 w-28 bg-white px-1.5 text-xs"
                      />
                    </label>
                  </div>
                )}
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
    if (
      userQ &&
      !r.username.toLowerCase().includes(userQ.toLowerCase()) &&
      !`${r.firstName} ${r.lastName}`.toLowerCase().includes(userQ.toLowerCase())
    )
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
          className="h-9 w-full bg-park-bg/50 sm:w-32"
        />
        <Input
          placeholder="Name or username"
          value={userQ}
          onChange={(e) => setUserQ(e.target.value)}
          className="h-9 w-full bg-park-bg/50 sm:w-40"
        />
      </div>
      <div className="min-h-[320px] max-h-[320px] overflow-auto rounded-xl border border-park-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-park-muted">No reservations found.</p>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex h-10 items-center gap-2 border-b border-park-border bg-park-sage/90 px-4">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAll}
                className="size-4 accent-park-green"
              />
              <span className="flex-1 text-xs font-semibold text-park-muted">
                Select all ({filtered.length})
              </span>
              {selected.size > 0 && (
                <>
                  {selectedActiveCount > 0 && (
                    <button
                      onClick={() => setBatchCancelOpen(true)}
                      className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-amber-600"
                    >
                      <XCircle className="size-3" />
                      Cancel {selectedActiveCount}
                    </button>
                  )}
                  <button
                    onClick={() => setBatchDeleteOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-xs font-bold text-white transition-colors hover:bg-destructive/90"
                  >
                    <Trash2 className="size-3" />
                    Delete {selected.size}
                  </button>
                </>
              )}
            </div>
            {filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 border-b border-park-border px-3 py-2.5 last:border-b-0 sm:gap-3 sm:px-4 sm:py-3"
              >
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  className="size-3.5 shrink-0 accent-park-green sm:size-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-nowrap text-sm font-semibold text-park-ink sm:text-base">
                    Bench {r.bench_code}
                    <span
                      className={cn(
                        "ml-1.5 inline-block align-middle rounded px-1 py-0.5 text-[9px] font-bold uppercase sm:ml-2 sm:px-1.5 sm:text-[10px]",
                        r.status === "cancelled"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-park-sage text-park-green",
                      )}
                    >
                      {r.status}
                    </span>
                  </p>
                  <p className="truncate text-xs text-park-muted sm:text-sm">
                    {r.firstName && r.lastName
                      ? `${r.firstName} ${r.lastName} (${r.username})`
                      : r.username}{" "}
                    · {formatRangeCompact(r.start_month, r.end_month)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-1.5">
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
        .filter((u) => {
          const q = userQ.toLowerCase();
          return (
            u.username.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
          );
        })
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
    <section className="h-fit overflow-hidden rounded-2xl border border-park-border bg-park-surface p-5">
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
              ? selectedUser.first_name && selectedUser.last_name
                ? `${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.username})`
                : `${selectedUser.username} — ${selectedUser.email}`
              : userQ
          }
          onChange={(v) => {
            setUserQ(v);
            setUserId("");
          }}
          matches={userMatches.map((u) => ({
            id: u.id,
            label:
              u.first_name && u.last_name
                ? `${u.first_name} ${u.last_name} (${u.username})`
                : `${u.username} — ${u.email}`,
          }))}
          onPick={(id, label) => {
            setUserId(id);
            setUserQ(label);
          }}
          placeholder="Search by name or username"
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
