"use client";

import type { QimelaPhase } from "@/lib/apiClient";
import styles from "./PhaseFilter.module.scss";

interface PhaseFilterProps {
  phases: QimelaPhase[];
  selectedPhaseId: string | null;
  onChange: (phaseId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function PhaseFilter({
  phases,
  selectedPhaseId,
  onChange,
  placeholder = "Seleccionar fase...",
  disabled,
}: PhaseFilterProps) {
  return (
    <div className={styles.field}>
      <select
        className={styles.select}
        aria-label="Fase"
        value={selectedPhaseId ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {phases.map((phase) => (
          <option key={phase.id} value={phase.id}>
            {phase.name}
            {phase.status === "ACTIVE" ? " (en curso)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
