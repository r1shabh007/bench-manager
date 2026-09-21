"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "./auth-modal";

export type AuthTab = "login" | "signup";

interface OpenOptions {
  tab?: AuthTab;
  onSuccess?: () => void;
}

interface AuthModalContextValue {
  open: (options?: OpenOptions) => void;
  close: () => void;
  isOpen: boolean;
}

const AuthModalContext = React.createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = React.useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within <AuthModalProvider>");
  }
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [tab, setTab] = React.useState<AuthTab>("login");
  const onSuccessRef = React.useRef<(() => void) | undefined>(undefined);

  const open = React.useCallback((options?: OpenOptions) => {
    setTab(options?.tab ?? "login");
    onSuccessRef.current = options?.onSuccess;
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    onSuccessRef.current = undefined;
  }, []);

  const handleSuccess = React.useCallback(() => {
    setIsOpen(false);
    // Refresh server components so nav/account reflect the new session.
    router.refresh();
    const cb = onSuccessRef.current;
    onSuccessRef.current = undefined;
    if (cb) {
      // Let the modal close before continuing the flow.
      setTimeout(cb, 50);
    }
  }, [router]);

  return (
    <AuthModalContext.Provider value={{ open, close, isOpen }}>
      {children}
      <AuthModal
        open={isOpen}
        tab={tab}
        onTabChange={setTab}
        onOpenChange={setIsOpen}
        onSuccess={handleSuccess}
      />
    </AuthModalContext.Provider>
  );
}
