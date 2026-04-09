"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Qimela, QimelaRole } from "@/types/qimela";

interface QimelaContextValue {
  selectedQimela: Qimela | null;
  viewAs: QimelaRole | null;
  selectQimela: (qimela: Qimela, viewAs: QimelaRole) => void;
}

const QimelaContext = createContext<QimelaContextValue | null>(null);

export function QimelaProvider({ children }: { children: ReactNode }) {
  const [selectedQimela, setSelectedQimela] = useState<Qimela | null>(null);
  const [viewAs, setViewAs] = useState<QimelaRole | null>(null);

  function selectQimela(qimela: Qimela, role: QimelaRole) {
    setSelectedQimela(qimela);
    setViewAs(role);
  }

  return (
    <QimelaContext.Provider value={{ selectedQimela, viewAs, selectQimela }}>
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
