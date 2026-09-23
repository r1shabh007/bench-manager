"use client";

import * as React from "react";
import {
  benchDot,
  selectVisibleBenches,
} from "@/lib/reservation-store";
import type { DotState } from "@/lib/availability";
import type { Bench } from "@/lib/types";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";

const PARK_CENTER: [number, number] = [40.8975, -73.8867];

const MAPTILER_KEY = "IiZFrC1qx8fwNPHZYNlS";
const TILE_URL = `https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
const ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const DOT_COLORS: Record<DotState, string> = {
  available: "#B85C5C",
  unavailable: "#6b7280",
  selected: "#FFD60A",
};

const DOT_Z: Record<DotState, number> = {
  unavailable: 0,
  available: 1000,
  selected: 2000,
};

const BOUNDS_SW: [number, number] = [40.8700, -73.9150];
const BOUNDS_NE: [number, number] = [40.9250, -73.8580];

export function BenchMap({ readOnly = false }: { readOnly?: boolean }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());
  const [ready, setReady] = React.useState(false);

  const store = useReservationApi();
  const visible = useReservationStore(selectVisibleBenches);
  useReservationStore((s) => s.selectedBenchId);
  useReservationStore((s) => s.selectedMonths);
  useReservationStore((s) => s.bookedByBench);

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

        L.tileLayer(TILE_URL, {
          attribution: ATTRIBUTION,
          maxZoom: 22,
        }).addTo(map);

        mapRef.current = map;
        setReady(true);
      } catch {
        // Strict mode double-mount: container already initialized
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

  React.useEffect(() => {
    if (!ready) return;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      const currentIds = new Set(visible.map((b) => b.id));
      const markers = markersRef.current;
      const state = store.getState();

      for (const [id, marker] of markers) {
        if (!currentIds.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }

      for (const bench of visible) {
        const dotState = benchDot(state, bench.id);
        const existing = markers.get(bench.id);

        if (existing) {
          updateMarkerColor(existing, dotState, bench);
          existing.setLatLng([bench.latitude, bench.longitude]);
        } else {
          const marker = createBenchMarker(
            L,
            bench,
            dotState,
            readOnly,
            () => store.getState().selectBench(bench.id),
          );
          marker.addTo(map);
          markers.set(bench.id, marker);
        }
      }
    });
  }, [visible, ready, store, readOnly]);

  React.useEffect(() => {
    if (!ready) return;
    const state = store.getState();
    const markers = markersRef.current;
    for (const bench of visible) {
      const marker = markers.get(bench.id);
      if (marker) {
        updateMarkerColor(marker, benchDot(state, bench.id), bench);
      }
    }
  });

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={containerRef}
        className="h-[500px] w-full overflow-hidden rounded-2xl border border-park-border"
      />
    </>
  );
}

function createBenchMarker(
  L: typeof import("leaflet"),
  bench: Bench,
  state: DotState,
  readOnly: boolean,
  onClick: () => void,
) {
  const icon = L.divIcon({
    className: "",
    html: `<div class="bench-dot" style="
      width:14px;height:14px;border-radius:50%;
      border:2px solid rgba(255,255,255,0.85);
      background:${DOT_COLORS[state]};
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
      transition:transform 0.15s,box-shadow 0.15s;
      cursor:${readOnly ? "default" : "pointer"};
    " title="Bench ${bench.code}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const marker = L.marker([bench.latitude, bench.longitude], {
    icon,
    zIndexOffset: DOT_Z[state],
  });

  if (!readOnly) {
    marker.on("click", onClick);
  }

  marker.bindTooltip(bench.code, {
    direction: "top",
    offset: [0, -10],
    className: "bench-tooltip",
  });

  return marker;
}

function updateMarkerColor(marker: any, state: DotState, bench: Bench) {
  marker.setZIndexOffset(DOT_Z[state]);
  const el = marker.getElement()?.querySelector(".bench-dot") as HTMLElement | null;
  if (!el) return;
  el.style.background = DOT_COLORS[state];
  el.style.boxShadow =
    state === "selected"
      ? "0 0 0 3px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.3)";
}
