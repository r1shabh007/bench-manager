"use client";

import { cn } from "@/lib/utils";
import {
  useReservationStore,
  useReservationApi,
} from "@/components/reservation/reservation-provider";

export function ViewToggle() {
  const store = useReservationApi();
  const view = useReservationStore((s) => s.view);

  return (
    <div className="inline-flex rounded-full border border-park-border bg-park-surface p-1">
      <ToggleButton
        active={view === "map"}
        onClick={() => store.getState().setView("map")}
      >
        Map
      </ToggleButton>
      <ToggleButton
        active={view === "list"}
        onClick={() => store.getState().setView("list")}
      >
        List / Calendar
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "bg-park-green text-white"
          : "text-park-muted hover:text-park-green",
      )}
    >
      {children}
    </button>
  );
}
