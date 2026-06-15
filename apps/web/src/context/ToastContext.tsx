"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (message: string, variant: ToastVariant) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const AUTO_REMOVE_MS = 7000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = crypto.randomUUID();
      setToasts((prev) => {
        const next = [...prev, { id, message, variant }];
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      setTimeout(() => remove(id), AUTO_REMOVE_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, remove }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return { toast: ctx.toast };
}

export function useToastItems() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastItems must be used within ToastProvider");
  return { toasts: ctx.toasts, remove: ctx.remove };
}
