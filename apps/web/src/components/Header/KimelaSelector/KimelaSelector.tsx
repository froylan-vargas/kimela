"use client";

import { useState, useEffect, useRef } from "react";
import { useKimelas } from "@/hooks/useKimelas";
import { useKimelaContext } from "@/context/KimelaContext";
import KimelaDropdown from "./KimelaDropdown";
import styles from "./KimelaSelector.module.scss";

export default function KimelaSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useKimelas();
  const { selectedKimela, viewAs, selectKimela } = useKimelaContext();

  const participatingKimelas = data?.data ?? [];
  const creatorKimelas = data?.data.filter((k) => k.role === "CREATOR") ?? [];

  // Default: last kimela with SUBSCRIBER role — never a creator-only kimela
  const defaultKimela = data?.data.findLast((k) => k.role === "SUBSCRIBER") ?? null;

  useEffect(() => {
    if (!selectedKimela && defaultKimela) {
      selectKimela(defaultKimela, "SUBSCRIBER");
    }
  }, [defaultKimela]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside to close
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function getPillLabel(): string {
    if (isLoading) return "Loading...";
    if (isError) return "Error loading";
    if (selectedKimela) return selectedKimela.name;
    return "Select a kimela";
  }

  return (
    <div className={styles.selectorWrapper} ref={wrapperRef}>
      <button
        className={styles.selectorPill}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.selectorLabel}>Kimela</span>
        <span className={styles.selectorValue}>{getPillLabel()}</span>
        <i
          className={`ph-bold ${isOpen ? "ph-caret-up" : "ph-caret-down"} ${styles.caretIcon}`}
        />
      </button>

      {isOpen && (
        <KimelaDropdown
          participatingKimelas={participatingKimelas}
          creatorKimelas={creatorKimelas}
          selectedId={selectedKimela?.id ?? null}
          selectedViewAs={viewAs}
          onSelect={selectKimela}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
