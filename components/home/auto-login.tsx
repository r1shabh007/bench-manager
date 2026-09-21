"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthModal } from "@/components/auth-modal/auth-modal-provider";

/**
 * When redirected to Home with `?login=1` (e.g. from visiting /account while
 * logged out), open the auth modal automatically and clean the URL.
 */
export function AutoLogin() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useAuthModal();
  const opened = React.useRef(false);

  React.useEffect(() => {
    if (opened.current) return;
    if (params.get("login") === "1") {
      opened.current = true;
      open({ tab: "login" });
      router.replace(pathname);
    }
  }, [params, open, router, pathname]);

  return null;
}
