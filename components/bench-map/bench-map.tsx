"use client";

import * as React from "react";
import Image from "next/image";
import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { BenchDot } from "./bench-dot";
import {
  benchDot,
  selectVisibleBenches,
} from "@/lib/reservation-store";
import { useReservationStore, useReservationApi } from "@/components/reservation/reservation-provider";

export function BenchMap({ readOnly = false }: { readOnly?: boolean }) {
  const store = useReservationApi();
  const visible = useReservationStore(selectVisibleBenches);
  // Subscribe to the pieces of state that affect dot colors so we re-render live.
  useReservationStore((s) => s.selectedBenchId);
  useReservationStore((s) => s.selectedMonths);
  useReservationStore((s) => s.bookedByBench);

  const selectBench = React.useCallback(
    (id: string) => store.getState().selectBench(id),
    [store],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-park-border bg-[#e5e4d5]">
      <TransformWrapper
        minScale={1}
        maxScale={6}
        doubleClick={{ mode: "zoomIn", step: 0.7 }}
        wheel={{ step: 0.15 }}
        panning={{ velocityDisabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
              <MapControl label="Zoom in" onClick={() => zoomIn()}>
                <ZoomIn className="size-4" />
              </MapControl>
              <MapControl label="Zoom out" onClick={() => zoomOut()}>
                <ZoomOut className="size-4" />
              </MapControl>
              <MapControl label="Reset view" onClick={() => resetTransform()}>
                <Maximize className="size-4" />
              </MapControl>
            </div>
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full"
            >
              <div className="relative aspect-[1584/672] w-full">
                <Image
                  src="/map/van-cortlandt-map.png"
                  alt="Map of Van Cortlandt Park showing bench locations"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="pointer-events-none select-none object-cover"
                />
                {visible.map((bench) => (
                  <BenchDot
                    key={bench.id}
                    bench={bench}
                    state={benchDot(store.getState(), bench.id)}
                    readOnly={readOnly}
                    onSelect={selectBench}
                  />
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

function MapControl({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md border border-park-border bg-park-surface/90 text-park-green shadow-sm backdrop-blur transition-colors hover:bg-park-surface"
    >
      {children}
    </button>
  );
}
