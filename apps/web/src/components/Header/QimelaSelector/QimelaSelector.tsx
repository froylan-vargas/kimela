"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "@/components/Icon/Icon";
import { useQimelas } from "@/hooks/useQimelas";
import { useQimelaContext } from "@/context/QimelaContext";
import QimelaDropdown from "./QimelaDropdown";
import styles from "./QimelaSelector.module.scss";

export default function QimelaSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQimelas();
  const { selectedQimela, viewAs, selectQimela } = useQimelaContext();

  const activeQimelas = data?.data.filter(
    (q) => q.status === "UPCOMING" || q.status === "ACTIVE",
  ) ?? [];
  const participatingQimelas = activeQimelas;
  const creatorQimelas = activeQimelas.filter((k) => k.role === "CREATOR");

  // Default: last qimela with SUBSCRIBER role — never a creator-only qimela
  const defaultQimela = activeQimelas.findLast((k) => k.role === "SUBSCRIBER") ?? null;

  useEffect(() => {
    if (!selectedQimela && defaultQimela) {
      selectQimela(defaultQimela, "SUBSCRIBER");
    }
  }, [defaultQimela]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (selectedQimela) return selectedQimela.name;
    return "Select a qimela";
  }

  return (
    <div className={styles.selectorWrapper} ref={wrapperRef}>
      <button
        className={styles.selectorPill}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-label="Seleccionar qimela"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.selectorValue}>{getPillLabel()}</span>
        <Icon
          name={isOpen ? "caret-up" : "caret-down"}
          className={styles.caretIcon}
        />
      </button>

      {isOpen && (
        <QimelaDropdown
          participatingQimelas={participatingQimelas}
          creatorQimelas={creatorQimelas}
          selectedId={selectedQimela?.id ?? null}
          selectedViewAs={viewAs}
          onSelect={selectQimela}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
