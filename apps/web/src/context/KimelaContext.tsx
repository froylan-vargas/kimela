"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Kimela, KimelaRole } from "@/types/kimela";

interface KimelaContextValue {
  selectedKimela: Kimela | null;
  viewAs: KimelaRole | null;
  selectKimela: (kimela: Kimela, viewAs: KimelaRole) => void;
}

const KimelaContext = createContext<KimelaContextValue | null>(null);

export function KimelaProvider({ children }: { children: ReactNode }) {
  const [selectedKimela, setSelectedKimela] = useState<Kimela | null>(null);
  const [viewAs, setViewAs] = useState<KimelaRole | null>(null);

  function selectKimela(kimela: Kimela, role: KimelaRole) {
    setSelectedKimela(kimela);
    setViewAs(role);
  }

  return (
    <KimelaContext.Provider value={{ selectedKimela, viewAs, selectKimela }}>
      {children}
    </KimelaContext.Provider>
  );
}

export function useKimelaContext(): KimelaContextValue {
  const ctx = useContext(KimelaContext);
  if (!ctx)
    throw new Error("useKimelaContext must be used inside KimelaProvider");
  return ctx;
}
