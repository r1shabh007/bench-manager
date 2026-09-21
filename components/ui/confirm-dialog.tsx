"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = React.useState(false);

  async function handle() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-park-border px-5 text-sm font-semibold text-park-green hover:bg-park-sage/50"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={busy}
            className={
              "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-white disabled:opacity-60 " +
              (destructive
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-park-green hover:bg-park-green/90")
            }
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
