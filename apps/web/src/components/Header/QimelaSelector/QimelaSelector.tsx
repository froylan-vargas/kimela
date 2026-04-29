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
  const participatingQimelas = activeQimelas.filter((k) => k.role === "SUBSCRIBER");
  const creatorQimelas = activeQimelas.filter((k) => k.role === "CREATOR");

  // Keep selectedQimela in sync when the list refetches (e.g. after a name edit)
  useEffect(() => {
    if (!selectedQimela || !data) return;
    const fresh = data.data.find((q) => q.id === selectedQimela.id);
    if (fresh && fresh.name !== selectedQimela.name) {
      selectQimela(fresh, viewAs ?? "CREATOR");
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isLoading) return "Cargando...";
    if (isError) return "Error al cargar";
    if (selectedQimela) return selectedQimela.name;
    return "Selecciona una qimela";
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
