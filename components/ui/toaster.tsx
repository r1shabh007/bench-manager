"use client";

import { useToastStore } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, X, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex max-w-md items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg",
            t.variant === "success" &&
              "border-park-green/30 bg-park-surface text-park-green",
            t.variant === "error" &&
              "border-destructive/30 bg-red-50 text-destructive",
            t.variant === "default" &&
              "border-park-border bg-park-surface text-park-ink",
          )}
        >
          {t.variant === "success" && (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          )}
          {t.variant === "error" && (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          {t.variant === "default" && (
            <Info className="mt-0.5 size-4 shrink-0 text-park-rust" />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="mt-0.5 shrink-0 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
