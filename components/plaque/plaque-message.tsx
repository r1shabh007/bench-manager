"use client";

import * as React from "react";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";

const MAX_LINE_LENGTH = 26;
const MAX_LINES = 3;
const MAX_CHARS = MAX_LINE_LENGTH * MAX_LINES;

function enforceLine(value: string): string {
  const lines = value.split("\n").slice(0, MAX_LINES);
  return lines.map((l) => l.slice(0, MAX_LINE_LENGTH)).join("\n");
}

export function PlaqueMessage() {
  const store = useReservationApi();
  const selectedYears = useReservationStore((s) => s.selectedYears);
  const selectedBenchId = useReservationStore((s) => s.selectedBenchId);
  const plaqueMessage = useReservationStore((s) => s.plaqueMessage);

  const active = selectedBenchId !== null && selectedYears.length > 0;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!active) return;
    store.getState().setPlaqueMessage(enforceLine(e.target.value));
  }

  return (
    <div className={`flex flex-col gap-2.5 transition-opacity ${active ? "" : "pointer-events-none opacity-40"}`}>
      <h3 className="font-serif text-2xl text-park-green">Bench plaque</h3>
      <p className="text-xs text-park-muted">
        Add a personal message to be displayed on your bench.
      </p>

      <div
        className="rounded-lg p-[6px]"
        style={{
          background:
            "linear-gradient(145deg, #c9a84c, #a67c32 30%, #c9a84c 50%, #a67c32 70%, #c9a84c)",
        }}
      >
        <div
          className="rounded-[4px] border-2 p-5"
          style={{
            background:
              "linear-gradient(160deg, #b8942d, #d4af37 25%, #c9a84c 50%, #b8942d 75%, #d4af37)",
            borderColor: "#8a6914",
          }}
        >
          <textarea
            value={plaqueMessage}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (!active) { e.preventDefault(); return; }
              if (e.key === "Enter") {
                const lines = (e.currentTarget.value.match(/\n/g) || []).length;
                if (lines >= MAX_LINES - 1) e.preventDefault();
              }
            }}
            disabled={!active}
            placeholder="In loving memory of..."
            rows={3}
            className="w-full resize-none bg-transparent text-center font-serif text-xs leading-relaxed outline-none placeholder:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: "#3d2e0a",
            }}
          />
        </div>
      </div>

      <p className="text-right text-[11px] text-park-muted">
        {plaqueMessage.length}/{MAX_CHARS} &middot; {MAX_LINE_LENGTH} per line
      </p>
    </div>
  );
}
