"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { DotState } from "@/lib/availability";
import type { Bench } from "@/lib/types";

const STATE_LABEL: Record<DotState, string> = {
  available: "available",
  unavailable: "unavailable",
  selected: "selected",
};

interface BenchDotProps {
  bench: Bench;
  state: DotState;
  readOnly?: boolean;
  onSelect?: (id: string) => void;
}

export const BenchDot = React.memo(function BenchDot({
  bench,
  state,
  readOnly,
  onSelect,
}: BenchDotProps) {
  const common =
    "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 shadow-sm transition-transform duration-150 focus:outline-none";
  const colors =
    state === "selected"
      ? "bg-bench-selected ring-2 ring-park-ink/70"
      : state === "available"
        ? "bg-bench-available"
        : "bg-bench-unavailable";

  const style: React.CSSProperties = {
    left: `${bench.x_pct}%`,
    top: `${bench.y_pct}%`,
    width: 11,
    height: 11,
  };

  if (readOnly) {
    return (
      <span
        className={cn(common, colors, "group")}
        style={style}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(bench.id)}
      className={cn(
        common,
        colors,
        "group cursor-pointer hover:z-10 hover:scale-[1.8] focus-visible:z-10 focus-visible:scale-[1.8] focus-visible:ring-2 focus-visible:ring-park-green",
      )}
      style={style}
      aria-label={`Bench ${bench.code}, ${STATE_LABEL[state]}`}
      aria-pressed={state === "selected"}
    >
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-park-ink px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        {bench.code}
      </span>
    </button>
  );
});
