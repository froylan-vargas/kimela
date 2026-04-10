"use client";

import { useState, useTransition } from "react";
import type { Phase, PhaseType } from "@/types/phase";
import { adminApi } from "@/lib/apiClient";
import styles from "./PhaseForm.module.scss";

const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
  REGULAR_SEASON: "Temporada Regular",
  PLAYOFFS: "Playoffs",
  OTHER: "Otro",
};

interface PhaseFormProps {
  eventId: string;
  onCreated: (phase: Phase) => void;
}

export default function PhaseForm({ eventId, onCreated }: PhaseFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PhaseType>("REGULAR_SEASON");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("El nombre de la fase es obligatorio.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adminApi.createPhase(eventId, { name: trimmedName, type });
        onCreated(res.data);
        setName("");
        setType("REGULAR_SEASON");
      } catch {
        setError("Error al guardar la fase. Intenta de nuevo.");
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.heading}>Nueva fase</h2>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="phase-name" className={styles.label}>
            Nombre
          </label>
          <input
            id="phase-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Fase de grupos"
            disabled={isPending}
            aria-required="true"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="phase-type" className={styles.label}>
            Tipo de fase
          </label>
          <select
            id="phase-type"
            className={styles.select}
            value={type}
            onChange={(e) => setType(e.target.value as PhaseType)}
            disabled={isPending}
          >
            {(Object.keys(PHASE_TYPE_LABELS) as PhaseType[]).map((key) => (
              <option key={key} value={key}>
                {PHASE_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar fase"}
      </button>
    </form>
  );
}
