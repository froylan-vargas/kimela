"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { qimelasApi } from "@/lib/apiClient";
import { useAuthContext } from "@/context/AuthContext";
import type { CoveredStages, QimelaDetail } from "@/types/qimela";
import styles from "./page.module.scss";

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Próxima",
  ACTIVE: "En curso",
  COMPLETED: "Completada",
};

const COVERED_STAGES_LABELS: Record<CoveredStages, string> = {
  REGULAR_SEASON: "Temporada regular",
  PLAYOFFS: "Playoffs",
  FULL: "Temporada completa (regular + playoffs)",
};

function getSelectableStages(
  status: string,
  coveredStages: CoveredStages,
): { value: CoveredStages; label: string }[] {
  if (status === "UPCOMING") {
    return (
      Object.entries(COVERED_STAGES_LABELS) as [CoveredStages, string][]
    ).map(([value, label]) => ({ value, label }));
  }
  if (status === "ACTIVE" && coveredStages === "REGULAR_SEASON") {
    return [
      { value: "REGULAR_SEASON", label: COVERED_STAGES_LABELS.REGULAR_SEASON },
      { value: "FULL", label: COVERED_STAGES_LABELS.FULL },
    ];
  }
  return (
    Object.entries(COVERED_STAGES_LABELS) as [CoveredStages, string][]
  ).map(([value, label]) => ({ value, label }));
}

export default function QimelaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();

  const [qimela, setQimela] = useState<QimelaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCoveredStages, setEditCoveredStages] =
    useState<CoveredStages>("REGULAR_SEASON");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    qimelasApi
      .getById(id)
      .then((res) => {
        setQimela(res.data);
        setEditName(res.data.name);
        setEditCoveredStages(res.data.coveredStages);
      })
      .catch(() => setError("No se pudo cargar la qimela."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>Cargando...</p>
      </main>
    );
  }

  if (error || !qimela) {
    return (
      <main className={styles.page}>
        <p className={styles.error}>{error ?? "Qimela no encontrada."}</p>
      </main>
    );
  }

  const isCreator = user?.id === qimela.creatorId;
  const isCompleted = qimela.status === "COMPLETED";
  const isActive = qimela.status === "ACTIVE";

  const hasChanged =
    editName !== qimela.name || editCoveredStages !== qimela.coveredStages;

  const isSelectDisabled =
    isCompleted ||
    (isActive && qimela.coveredStages !== "REGULAR_SEASON");

  const selectableStages = getSelectableStages(qimela.status, qimela.coveredStages);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!qimela || !hasChanged || isCompleted) return;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await qimelasApi.update(id, {
        name: editName,
        coveredStages: editCoveredStages,
      });
      setQimela((prev) =>
        prev
          ? {
              ...prev,
              name: res.data.name,
              status: res.data.status,
              coveredStages: res.data.coveredStages,
              startPhaseId: res.data.startPhaseId,
              endPhaseId: res.data.endPhaseId,
            }
          : prev,
      );
      setEditName(res.data.name);
      setEditCoveredStages(res.data.coveredStages);
    } catch {
      setSaveError("No se pudieron guardar los cambios. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{qimela.name}</h1>
        <span
          className={`${styles.statusBadge} ${styles[`statusBadge--${qimela.status.toLowerCase()}`]}`}
        >
          {STATUS_LABELS[qimela.status] ?? qimela.status}
        </span>
      </div>

      {isCreator && (
        <section className={styles.editSection}>
          <h2 className={styles.editHeading}>Editar qimela</h2>
          <form onSubmit={handleSave} noValidate>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="edit-name" className={styles.label}>
                  Nombre
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className={styles.input}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isCompleted}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-covered-stages" className={styles.label}>
                  Etapas cubiertas
                </label>
                <select
                  id="edit-covered-stages"
                  className={styles.select}
                  value={editCoveredStages}
                  onChange={(e) =>
                    setEditCoveredStages(e.target.value as CoveredStages)
                  }
                  disabled={isSelectDisabled}
                >
                  {selectableStages.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {saveError && <p className={styles.saveError}>{saveError}</p>}

            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isCompleted || !hasChanged || saving}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
