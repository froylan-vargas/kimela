"use client";

import { useSports } from "@/hooks/useSports";
import type { SessionFormat } from "@/types/sport";
import styles from "./SportSelect.module.scss";

interface SportSelectProps {
  value: string | null;
  onChange: (sportId: string, sessionFormat: SessionFormat) => void;
}

export default function SportSelect({ value, onChange }: SportSelectProps) {
  const { data: sports, isLoading, isError } = useSports();

  if (isError) {
    return (
      <p className={styles.error}>Error al cargar los deportes. Intenta de nuevo.</p>
    );
  }

  return (
    <div className={styles.wrapper}>
      <label htmlFor="sport-select" className={styles.label}>
        Deporte
      </label>
      <select
        id="sport-select"
        className={styles.select}
        value={value ?? ""}
        onChange={(e) => {
          const sport = sports?.find((s) => s.id === e.target.value);
          if (sport) onChange(sport.id, sport.sessionFormat);
        }}
        disabled={isLoading}
        aria-label="Selecciona un deporte"
      >
        <option value="" disabled>
          {isLoading ? "Cargando deportes..." : "Selecciona un deporte"}
        </option>
        {sports?.map((sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.name}
          </option>
        ))}
      </select>
    </div>
  );
}
