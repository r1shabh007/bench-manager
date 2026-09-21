"use client";

import Link from "next/link";

/** Hero call-to-action buttons (client for the smooth-scroll "How it works"). */
export function HomeCta() {
  return (
    <div className="flex gap-3">
      <Link
        href="/reservation"
        className="inline-flex h-11 items-center justify-center rounded-md bg-park-green px-[18px] text-sm font-bold text-white transition-colors hover:bg-park-green/90"
      >
        Find a bench
      </Link>
      <a
        href="#how-it-works"
        className="inline-flex h-11 items-center justify-center rounded-md border border-park-green bg-park-surface px-[18px] text-sm font-bold text-park-green transition-colors hover:bg-park-sage/50"
      >
        How it works
      </a>
    </div>
  );
}
