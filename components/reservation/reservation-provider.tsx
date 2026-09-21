"use client";

import * as React from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { createClient } from "@/lib/supabase/client";
import {
  createReservationStore,
  type ReservationInit,
  type ReservationState,
  type ReservationStore,
  type BookedRow,
} from "@/lib/reservation-store";
import { currentYearNY, monthKey } from "@/lib/months";
import { useToastStore } from "@/lib/toast";

const StoreContext = React.createContext<ReservationStore | null>(null);

export function ReservationProvider({
  init,
  children,
}: {
  init: ReservationInit;
  children: React.ReactNode;
}) {
  const storeRef = React.useRef<ReservationStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createReservationStore(init);
  }
  const store = storeRef.current;

  // Subscribe to Supabase Realtime so other users' bookings update live.
  React.useEffect(() => {
    const supabase = createClient();
    const year = currentYearNY();
    const start = `${year}-01-01`;
    const end = `${monthKey(year + 1, 12)}-01`;

    async function refetch() {
      const { data } = await supabase
        .from("reservation_months")
        .select("bench_id, month")
        .gte("month", start)
        .lte("month", end);
      if (data) {
        const rows: BookedRow[] = data.map((r) => ({
          bench_id: r.bench_id as string,
          month: (r.month as string).slice(0, 7),
        }));
        store.getState().setBooked(rows);
      }
    }

    const channel = supabase
      .channel("reservation_months_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservation_months" },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [store]);

  return (
    <StoreContext.Provider value={store}>
      <NoticeBridge store={store} />
      {children}
    </StoreContext.Provider>
  );
}

/** Surfaces store notices as toasts, then clears them. */
function NoticeBridge({ store }: { store: ReservationStore }) {
  const notice = useStore(store, (s) => s.notice);
  const clearNotice = useStore(store, (s) => s.clearNotice);
  const push = useToastStore((s) => s.push);

  React.useEffect(() => {
    if (notice) {
      push(notice, "default");
      clearNotice();
    }
  }, [notice, push, clearNotice]);

  return null;
}

export function useReservationStore<T>(selector: (s: ReservationState) => T): T {
  const store = React.useContext(StoreContext);
  if (!store) {
    throw new Error(
      "useReservationStore must be used within <ReservationProvider>",
    );
  }
  return useStore(store, useShallow(selector));
}

export function useReservationApi() {
  const store = React.useContext(StoreContext);
  if (!store) {
    throw new Error(
      "useReservationApi must be used within <ReservationProvider>",
    );
  }
  return store;
}
