"use client";

import * as React from "react";
import { Lock, Unlock, Trash2 } from "lucide-react";
import type { Bench } from "@/lib/types";

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
  onBatchRestrict: (ids: string[]) => void;
  onBatchUnrestrict: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
  externalMoveId?: string | null;
  onClearExternalMove?: () => void;
}

export function AdminBenchMap({
  benches,
  selectedIds,
  onToggleSelect,
  onUpdateCoordinates,
  onBatchRestrict,
  onBatchUnrestrict,
  onBatchDelete,
  externalMoveId,
  onClearExternalMove,
}: AdminBenchMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const LRef = React.useRef<typeof import("leaflet") | null>(null);
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
          maxZoom: 19,
          maxBounds: L.latLngBounds(BOUNDS_SW, BOUNDS_NE),
          maxBoundsViscosity: 1.0,
        });
        L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
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
          onToggleSelect(bench.id, true);
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

  // Handle move mode: make the marker draggable
  React.useEffect(() => {
    if (!ready) return;
    const markers = markersRef.current;

    if (mode.type === "move") {
      const marker = markers.get(mode.benchId);
      if (marker && !marker.dragging.enabled()) {
        marker.dragging.enable();
        marker.on("drag", () => {
          const pos = marker.getLatLng();
          setMode((prev) =>
            prev.type === "move"
              ? {
                  ...prev,
                  lat: pos.lat,
                  lng: pos.lng,
                  latInput: pos.lat.toFixed(6),
                  lngInput: pos.lng.toFixed(6),
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
      }
    }
  }, [mode.type, mode.type === "move" ? mode.benchId : null, ready]);

  function startMove() {
    if (!selectedBench) return;
    startMoveForBench(selectedBench);
  }

  function startMoveForBench(bench: Bench) {
    setMode({
      type: "move",
      benchId: bench.id,
      lat: bench.latitude,
      lng: bench.longitude,
      latInput: bench.latitude.toFixed(6),
      lngInput: bench.longitude.toFixed(6),
      origLat: bench.latitude,
      origLng: bench.longitude,
    });
  }

  React.useEffect(() => {
    if (!externalMoveId || !ready) return;
    const bench = benches.find((b) => b.id === externalMoveId);
    if (bench) {
      startMoveForBench(bench);
    }
    onClearExternalMove?.();
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
          <span className="pointer-events-none absolute right-3 top-3 z-[1000] rounded bg-white/80 px-2 py-1 text-xs font-bold text-destructive backdrop-blur-sm">
            {selectedIds.size} selected
          </span>
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

      {/* Selection panel — single or multi */}
      {selectedIds.size > 0 && mode.type === "idle" && (
        <SelectionPanel
          benches={benches}
          selectedIds={selectedIds}
          onStartMove={startMove}
          onBatchRestrict={onBatchRestrict}
          onBatchUnrestrict={onBatchUnrestrict}
          onBatchDelete={onBatchDelete}
        />
      )}

      {/* Move mode — drag dot OR type coordinates */}
      {mode.type === "move" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-bold text-park-ink">
            Move — Bench{" "}
            {benches.find((b) => b.id === mode.benchId)?.code}
          </p>
          <p className="mb-2 text-xs text-park-muted">
            Drag the dot on the map or type coordinates below.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-park-ink">
                Latitude
              </span>
              <input
                type="text"
                value={mode.latInput}
                onChange={(e) => handleLatInput(e.target.value)}
                className="h-8 w-32 rounded-md border border-park-border bg-white px-2 font-mono text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-park-ink">
                Longitude
              </span>
              <input
                type="text"
                value={mode.lngInput}
                onChange={(e) => handleLngInput(e.target.value)}
                className="h-8 w-32 rounded-md border border-park-border bg-white px-2 font-mono text-sm"
              />
            </label>
            <button
              onClick={confirmMove}
              disabled={saving}
              className="h-8 rounded-md bg-park-green px-4 text-xs font-bold text-white hover:bg-park-green/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            <button
              onClick={cancelMove}
              className="h-8 rounded-md border border-park-border px-4 text-xs font-bold text-park-muted hover:bg-park-sage/30"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionPanel({
  benches,
  selectedIds,
  onStartMove,
  onBatchRestrict,
  onBatchUnrestrict,
  onBatchDelete,
}: {
  benches: Bench[];
  selectedIds: Set<string>;
  onStartMove: () => void;
  onBatchRestrict: (ids: string[]) => void;
  onBatchUnrestrict: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
}) {
  const selected = benches.filter((b) => selectedIds.has(b.id));
  const multiSelect = selected.length > 1;
  const singleBench = selected.length === 1 ? selected[0] : null;
  const restrictableIds = selected.filter((b) => !b.restricted).map((b) => b.id);
  const unrestrictableIds = selected.filter((b) => b.restricted).map((b) => b.id);

  return (
    <div className="rounded-xl border border-park-border bg-park-surface p-3">
      {/* Header */}
      {singleBench ? (
        <div className="mb-2">
          <p className="text-sm font-bold text-park-ink">
            Bench {singleBench.code}
          </p>
          <p className="font-mono text-xs text-park-muted">
            {singleBench.latitude.toFixed(6)},{" "}
            {singleBench.longitude.toFixed(6)}
          </p>
        </div>
      ) : (
        <p className="mb-2 text-sm font-bold text-park-ink">
          {selected.length} benches selected
        </p>
      )}

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Move button */}
        {multiSelect ? (
          <div className="flex flex-col gap-0.5">
            <button
              disabled
              className="inline-flex w-16 items-center justify-center rounded-md bg-park-green/5 px-3 py-1.5 text-xs font-bold text-park-muted cursor-not-allowed"
            >
              Move
            </button>
            <span className="text-[10px] text-park-muted">
              Only 1 bench can be moved at a time. You have {selected.length} selected.
            </span>
          </div>
        ) : (
          <button
            onClick={onStartMove}
            className="inline-flex w-16 items-center justify-center rounded-md bg-park-green/10 px-3 py-1.5 text-xs font-bold text-park-green transition-colors hover:bg-park-green/20"
          >
            Move
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {restrictableIds.length > 0 && (
            <button
              onClick={() => onBatchRestrict(restrictableIds)}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
            >
              <Lock className="size-3.5" />
              Restrict{multiSelect ? ` ${restrictableIds.length}` : ""}
            </button>
          )}
          {unrestrictableIds.length > 0 && (
            <button
              onClick={() => onBatchUnrestrict(unrestrictableIds)}
              className="inline-flex items-center gap-1.5 rounded-md bg-park-green/10 px-3 py-1.5 text-xs font-bold text-park-green transition-colors hover:bg-park-green/20"
            >
              <Unlock className="size-3.5" />
              Unrestrict{multiSelect ? ` ${unrestrictableIds.length}` : ""}
            </button>
          )}
          <button
            onClick={() => onBatchDelete(Array.from(selectedIds))}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-destructive/90"
          >
            <Trash2 className="size-3.5" />
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
