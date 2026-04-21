"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Qimela, QimelaRole } from "@/types/qimela";
import { useAuthContext } from "@/context/AuthContext";

interface QimelaContextValue {
  selectedQimela: Qimela | null;
  viewAs: QimelaRole | null;
  selectQimela: (qimela: Qimela, viewAs: QimelaRole) => void;
  clearQimela: () => void;
}

const QimelaContext = createContext<QimelaContextValue | null>(null);

export function QimelaProvider({ children }: { children: ReactNode }) {
  const [selectedQimela, setSelectedQimela] = useState<Qimela | null>(null);
  const [viewAs, setViewAs] = useState<QimelaRole | null>(null);
  const { user } = useAuthContext();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextId = user?.id ?? null;
    if (previousUserIdRef.current !== null && previousUserIdRef.current !== nextId) {
      setSelectedQimela(null);
      setViewAs(null);
    }
    previousUserIdRef.current = nextId;
  }, [user?.id]);

  function selectQimela(qimela: Qimela, role: QimelaRole) {
    setSelectedQimela(qimela);
    setViewAs(role);
  }

  function clearQimela() {
    setSelectedQimela(null);
    setViewAs(null);
  }

  return (
    <QimelaContext.Provider value={{ selectedQimela, viewAs, selectQimela, clearQimela }}>
      {children}
    </QimelaContext.Provider>
  );
}

export function useQimelaContext(): QimelaContextValue {
  const ctx = useContext(QimelaContext);
  if (!ctx)
    throw new Error("useQimelaContext must be used inside QimelaProvider");
  return ctx;
}
