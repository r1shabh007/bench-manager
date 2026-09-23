"use client";

import * as React from "react";
import { Lock, Unlock, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bench, Region } from "@/lib/types";
import { REGIONS, REGION_LABEL } from "@/lib/types";

const PARK_CENTER: [number, number] = [40.8975, -73.8867];
const MAPTILER_KEY = "IiZFrC1qx8fwNPHZYNlS";
const TILE_URL = `https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
const ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const BOUNDS_SW: [number, number] = [40.87, -73.915];
const BOUNDS_NE: [number, number] = [40.925, -73.858];

type AdminDotState = "available" | "restricted" | "selected";

const DOT_COLORS: Record<AdminDotState, string> = {
  available: "#B85C5C",
  restricted: "#000000",
  selected: "#FFD60A",
};

function getDotState(bench: Bench, selectedIds: Set<string>): AdminDotState {
  if (selectedIds.has(bench.id)) return "selected";
  if (bench.restricted) return "restricted";
  return "available";
}

type MapMode =
  | { type: "idle" }
  | {
      type: "move";
      benchId: string;
      lat: number;
      lng: number;
      latInput: string;
      lngInput: string;
      origLat: number;
      origLng: number;
    };

interface AdminBenchMapProps {
  benches: Bench[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, multi: boolean) => void;
  onUpdateCoordinates: (id: string, lat: number, lng: number) => Promise<boolean>;
  onDeselect: () => void;
  onBatchRestrict: (ids: string[]) => void;
  onBatchUnrestrict: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
  onUpdateBench: (id: string, updates: { code?: string; region?: Region }) => Promise<boolean>;
  externalMoveId?: string | null;
  onCancelExternalMove?: () => void;
  onStartMove?: (benchId: string) => void;
}

export function AdminBenchMap({
  benches,
  selectedIds,
  onToggleSelect,
  onUpdateCoordinates,
  onUpdateBench,
  onDeselect,
  onBatchRestrict,
  onBatchUnrestrict,
  onBatchDelete,
  externalMoveId,
  onCancelExternalMove,
  onStartMove: onStartMoveExternal,
}: AdminBenchMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const LRef = React.useRef<typeof import("leaflet") | null>(null);
  const onToggleSelectRef = React.useRef(onToggleSelect);
  onToggleSelectRef.current = onToggleSelect;
  const [ready, setReady] = React.useState(false);
  const [mode, setMode] = React.useState<MapMode>({ type: "idle" });
  const [saving, setSaving] = React.useState(false);

  const selectedBench =
    selectedIds.size === 1
      ? benches.find((b) => b.id === Array.from(selectedIds)[0])
      : null;

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      try {
        const container = containerRef.current as any;
        if (container._leaflet_id) delete container._leaflet_id;
        const map = L.map(containerRef.current, {
          center: PARK_CENTER,
          zoom: 14,
          minZoom: 13,
          maxZoom: 22,
          maxBounds: L.latLngBounds(BOUNDS_SW, BOUNDS_NE),
          maxBoundsViscosity: 1.0,
        });
        L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 22 }).addTo(map);
        mapRef.current = map;
        LRef.current = L;
        setReady(true);
      } catch {
        // strict mode double-mount
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync markers with benches + selection
  React.useEffect(() => {
    if (!ready || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(benches.map((b) => b.id));
    const markers = markersRef.current;

    for (const [id, marker] of markers) {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    for (const bench of benches) {
      const dotState = getDotState(bench, selectedIds);
      const existing = markers.get(bench.id);

      if (existing) {
        updateMarkerStyle(existing, dotState);
        if (mode.type !== "move" || mode.benchId !== bench.id) {
          existing.setLatLng([bench.latitude, bench.longitude]);
        }
      } else {
        const icon = L.divIcon({
          className: "",
          html: `<div class="admin-bench-dot" style="
            width:14px;height:14px;border-radius:50%;
            border:2px solid rgba(255,255,255,0.85);
            background:${DOT_COLORS[dotState]};
            box-shadow:0 1px 3px rgba(0,0,0,0.3);
            transition:transform 0.15s,box-shadow 0.15s;
            cursor:pointer;
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([bench.latitude, bench.longitude], { icon });
        marker.on("click", () => {
          onToggleSelectRef.current(bench.id, true);
        });
        marker.bindTooltip(bench.code, {
          direction: "top",
          offset: [0, -10],
          className: "bench-tooltip",
        });
        marker.addTo(map);
        markers.set(bench.id, marker);
      }
    }
  });

  // Handle move mode: make the marker draggable, raise it above others
  React.useEffect(() => {
    if (!ready) return;
    const markers = markersRef.current;

    if (mode.type === "move") {
      const movingMarker = markers.get(mode.benchId);

      for (const [id, marker] of markers) {
        const el = marker.getElement() as HTMLElement | null;
        if (!el) continue;
        if (id === mode.benchId) {
          el.style.zIndex = "10000";
          el.style.opacity = "1";
        } else {
          el.style.opacity = "0.3";
        }
      }

      if (movingMarker && !movingMarker.dragging.enabled()) {
        movingMarker.dragging.enable();
        movingMarker.on("drag", () => {
          const pos = movingMarker.getLatLng();
          setMode((prev) =>
            prev.type === "move"
              ? {
                  ...prev,
                  lat: pos.lat,
                  lng: pos.lng,
                  latInput: pos.lat.toFixed(9),
                  lngInput: pos.lng.toFixed(9),
                }
              : prev,
          );
        });
      }
    } else {
      for (const [, marker] of markers) {
        if (marker.dragging?.enabled()) {
          marker.dragging.disable();
          marker.off("drag");
        }
        const el = marker.getElement() as HTMLElement | null;
        if (el) {
          el.style.zIndex = "";
          el.style.opacity = "1";
        }
      }
    }
  }, [mode.type, mode.type === "move" ? mode.benchId : null, ready]);

  function startMove() {
    if (!selectedBench) return;
    onStartMoveExternal?.(selectedBench.id);
    startMoveForBench(selectedBench);
  }

  function startMoveForBench(bench: Bench) {
    setMode({
      type: "move",
      benchId: bench.id,
      lat: bench.latitude,
      lng: bench.longitude,
      latInput: bench.latitude.toFixed(9),
      lngInput: bench.longitude.toFixed(9),
      origLat: bench.latitude,
      origLng: bench.longitude,
    });
  }

  React.useEffect(() => {
    if (!externalMoveId) {
      if (mode.type === "move") {
        const marker = markersRef.current.get(mode.benchId);
        if (marker) marker.setLatLng([mode.origLat, mode.origLng]);
        setMode({ type: "idle" });
      }
      return;
    }
    if (!ready) return;
    const bench = benches.find((b) => b.id === externalMoveId);
    if (bench) startMoveForBench(bench);
  }, [externalMoveId, ready]);

  function handleLatInput(value: string) {
    if (mode.type !== "move") return;
    const parsed = parseFloat(value);
    const newLat = isNaN(parsed) ? mode.lat : parsed;
    setMode({ ...mode, latInput: value, lat: newLat });
    if (!isNaN(parsed)) {
      const marker = markersRef.current.get(mode.benchId);
      if (marker) marker.setLatLng([newLat, mode.lng]);
    }
  }

  function handleLngInput(value: string) {
    if (mode.type !== "move") return;
    const parsed = parseFloat(value);
    const newLng = isNaN(parsed) ? mode.lng : parsed;
    setMode({ ...mode, lngInput: value, lng: newLng });
    if (!isNaN(parsed)) {
      const marker = markersRef.current.get(mode.benchId);
      if (marker) marker.setLatLng([mode.lat, newLng]);
    }
  }

  async function confirmMove() {
    if (mode.type !== "move") return;
    setSaving(true);
    const ok = await onUpdateCoordinates(mode.benchId, mode.lat, mode.lng);
    setSaving(false);
    if (ok) setMode({ type: "idle" });
  }

  function cancelMove() {
    if (mode.type !== "move") return;
    const marker = markersRef.current.get(mode.benchId);
    if (marker) marker.setLatLng([mode.origLat, mode.origLng]);
    setMode({ type: "idle" });
    if (externalMoveId === mode.benchId) onCancelExternalMove?.();
  }

  return (
    <div className="flex flex-col gap-3">
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
      />
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[500px] w-full overflow-hidden rounded-2xl border border-park-border"
        />
        {selectedIds.size > 0 && (
          <span className="pointer-events-none absolute right-3 top-3 z-[500] rounded bg-white/80 px-2 py-1 text-xs font-bold text-destructive backdrop-blur-sm">
            {selectedIds.size} selected
          </span>
        )}

        {/* Selection panel — overlays bottom of map */}
        {selectedIds.size > 0 && mode.type === "idle" && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl">
            <SelectionPanel
              benches={benches}
              selectedIds={selectedIds}
              onStartMove={startMove}
              onUpdateBench={onUpdateBench}
              onDeselect={onDeselect}
              onBatchRestrict={onBatchRestrict}
              onBatchUnrestrict={onBatchUnrestrict}
              onBatchDelete={onBatchDelete}
            />
          </div>
        )}

        {/* Move mode — overlays bottom of map */}
        {mode.type === "move" && (
          <div className="absolute bottom-2 left-2 right-2 z-[1000] rounded-xl border border-amber-300/80 bg-amber-50/85 p-2 backdrop-blur-sm sm:bottom-3 sm:left-3 sm:right-3 sm:p-3">
            <p className="mb-1.5 text-xs font-bold text-park-ink sm:mb-2 sm:text-sm">
              Move — Bench{" "}
              {benches.find((b) => b.id === mode.benchId)?.code}
            </p>
            <p className="mb-1.5 text-[10px] text-park-muted sm:mb-2 sm:text-xs">
              Drag the dot on the map or type coordinates below.
            </p>
            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <label className="flex flex-col gap-0.5 sm:gap-1">
                <span className="text-[10px] font-semibold text-park-ink sm:text-xs">
                  Latitude
                </span>
                <input
                  type="text"
                  value={mode.latInput}
                  onChange={(e) => handleLatInput(e.target.value)}
                  className="h-7 w-32 rounded-md border border-park-border bg-white px-1.5 font-mono text-[10px] sm:h-8 sm:w-40 sm:px-2 sm:text-xs"
                />
              </label>
              <label className="flex flex-col gap-0.5 sm:gap-1">
                <span className="text-[10px] font-semibold text-park-ink sm:text-xs">
                  Longitude
                </span>
                <input
                  type="text"
                  value={mode.lngInput}
                  onChange={(e) => handleLngInput(e.target.value)}
                  className="h-7 w-32 rounded-md border border-park-border bg-white px-1.5 font-mono text-[10px] sm:h-8 sm:w-40 sm:px-2 sm:text-xs"
                />
              </label>
              <button
                onClick={confirmMove}
                disabled={saving}
                className="h-7 rounded-md bg-park-green px-3 text-[10px] font-bold text-white hover:bg-park-green/90 disabled:opacity-60 sm:h-8 sm:px-4 sm:text-xs"
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
              <button
                onClick={cancelMove}
                className="h-7 rounded-md border border-park-border px-3 text-[10px] font-bold text-park-muted hover:bg-park-sage/30 sm:h-8 sm:px-4 sm:text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-park-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: DOT_COLORS.available }} />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: "#6b7280" }} />
          Unavailable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: DOT_COLORS.restricted }} />
          Restricted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: DOT_COLORS.selected }} />
          Selected
        </span>
      </div>
    </div>
  );
}

function SelectionPanel({
  benches,
  selectedIds,
  onStartMove,
  onUpdateBench,
  onDeselect,
  onBatchRestrict,
  onBatchUnrestrict,
  onBatchDelete,
}: {
  benches: Bench[];
  selectedIds: Set<string>;
  onStartMove: () => void;
  onUpdateBench: (id: string, updates: { code?: string; region?: Region }) => Promise<boolean>;
  onDeselect: () => void;
  onBatchRestrict: (ids: string[]) => void;
  onBatchUnrestrict: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
}) {
  const selected = benches.filter((b) => selectedIds.has(b.id));
  const multiSelect = selected.length > 1;
  const singleBench = selected.length === 1 ? selected[0] : null;
  const restrictableIds = selected.filter((b) => !b.restricted).map((b) => b.id);
  const unrestrictableIds = selected.filter((b) => b.restricted).map((b) => b.id);

  const [editingCode, setEditingCode] = React.useState(false);
  const [editCode, setEditCode] = React.useState("");
  const [editingRegion, setEditingRegion] = React.useState(false);
  const [editRegion, setEditRegion] = React.useState<Region>("north");
  const [editSaving, setEditSaving] = React.useState(false);

  async function saveCode() {
    if (!singleBench) return;
    setEditSaving(true);
    const ok = await onUpdateBench(singleBench.id, { code: editCode });
    setEditSaving(false);
    if (ok) setEditingCode(false);
  }

  async function saveRegion() {
    if (!singleBench) return;
    setEditSaving(true);
    const ok = await onUpdateBench(singleBench.id, { region: editRegion });
    setEditSaving(false);
    if (ok) setEditingRegion(false);
  }

  return (
    <div className="rounded-xl border border-park-border/80 bg-park-surface/85 p-2 backdrop-blur-sm sm:p-3">
      {/* Header */}
      {singleBench ? (
        <div className="mb-1.5 sm:mb-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {editingCode ? (
              <>
                <span className="text-xs text-park-muted sm:text-sm">Bench</span>
                <input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  autoFocus
                  className="h-5 w-14 rounded-md border border-park-border bg-white px-1 text-xs font-semibold sm:h-6 sm:w-16 sm:px-1.5 sm:text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") saveCode(); if (e.key === "Escape") setEditingCode(false); }}
                />
                <button onClick={saveCode} disabled={editSaving} className="rounded p-0.5 text-park-green hover:bg-park-green/10 disabled:opacity-50">
                  {editSaving ? <Loader2 className="size-3 animate-spin sm:size-3.5" /> : <Check className="size-3 sm:size-3.5" />}
                </button>
                <button onClick={() => setEditingCode(false)} disabled={editSaving} className="rounded p-0.5 text-destructive/60 hover:text-destructive disabled:opacity-50">
                  <X className="size-3 sm:size-3.5" />
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-park-ink sm:text-sm">
                  Bench {singleBench.code}
                </p>
                <button
                  onClick={() => { setEditCode(singleBench.code); setEditingCode(true); setEditingRegion(false); }}
                  className="rounded p-0.5 text-park-muted/50 hover:text-park-ink"
                >
                  <Pencil className="size-2.5 sm:size-3" />
                </button>
              </>
            )}
            <span className="mx-0.5 text-park-muted sm:mx-1">·</span>
            {editingRegion ? (
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
                <button onClick={saveRegion} disabled={editSaving} className="rounded p-0.5 text-park-green hover:bg-park-green/10 disabled:opacity-50">
                  {editSaving ? <Loader2 className="size-3 animate-spin sm:size-3.5" /> : <Check className="size-3 sm:size-3.5" />}
                </button>
                <button onClick={() => setEditingRegion(false)} disabled={editSaving} className="rounded p-0.5 text-destructive/60 hover:text-destructive disabled:opacity-50">
                  <X className="size-3 sm:size-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-[10px] text-park-muted sm:text-xs">{REGION_LABEL[singleBench.region]}</span>
                <button
                  onClick={() => { setEditRegion(singleBench.region); setEditingRegion(true); setEditingCode(false); }}
                  className="rounded p-0.5 text-park-muted/50 hover:text-park-ink"
                >
                  <Pencil className="size-2.5 sm:size-3" />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center">
            <p className="font-mono text-[10px] text-park-muted sm:text-xs">
              {singleBench.latitude.toFixed(9)},{" "}
              {singleBench.longitude.toFixed(9)}
            </p>
            <button
              onClick={onDeselect}
              className="ml-auto text-[9px] font-semibold text-park-muted hover:text-park-ink sm:text-[10px]"
            >
              Deselect all
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-1.5 flex items-baseline sm:mb-2">
          <p className="text-xs font-bold text-park-ink sm:text-sm">
            {selected.length} benches selected
          </p>
          <span className="ml-1.5 text-[9px] text-park-muted sm:ml-2 sm:text-[10px]">
            — select 1 to move or edit
          </span>
          <button
            onClick={onDeselect}
            className="ml-auto text-[9px] font-semibold text-park-muted hover:text-park-ink sm:text-[10px]"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Move button */}
        <button
          onClick={multiSelect ? undefined : onStartMove}
          disabled={multiSelect}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold transition-colors sm:px-3 sm:py-1.5 sm:text-xs",
            multiSelect
              ? "bg-park-green/5 text-park-muted cursor-not-allowed"
              : "bg-park-green/10 text-park-green hover:bg-park-green/20",
          )}
        >
          Move
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onBatchRestrict(restrictableIds)}
            disabled={restrictableIds.length === 0}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
              restrictableIds.length === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-destructive/10 text-destructive hover:bg-destructive/20",
            )}
          >
            <Lock className="size-3 sm:size-3.5" />
            Restrict{multiSelect ? ` ${restrictableIds.length}` : ""}
          </button>
          <button
            onClick={() => onBatchUnrestrict(unrestrictableIds)}
            disabled={unrestrictableIds.length === 0}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
              unrestrictableIds.length === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-park-green/10 text-park-green hover:bg-park-green/20",
            )}
          >
            <Unlock className="size-3 sm:size-3.5" />
            Unrestrict{multiSelect ? ` ${unrestrictableIds.length}` : ""}
          </button>
          <button
            onClick={() => onBatchDelete(Array.from(selectedIds))}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-destructive px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-destructive/90 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <Trash2 className="size-3 sm:size-3.5" />
            Delete{multiSelect ? ` ${selected.length}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function updateMarkerStyle(marker: any, state: AdminDotState) {
  const el = marker.getElement()?.querySelector(".admin-bench-dot") as HTMLElement | null;
  if (!el) return;
  el.style.background = DOT_COLORS[state];
  el.style.boxShadow =
    state === "selected"
      ? "0 0 0 3px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.3)";
}
