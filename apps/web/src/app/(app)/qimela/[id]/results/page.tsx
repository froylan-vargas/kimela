"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PhaseFilter from "@/components/qimela/ResultsComparison/PhaseFilter";
import UserCompareSelector, {
  type CompareUserOption,
} from "@/components/qimela/ResultsComparison/UserCompareSelector";
import ComparisonCard from "@/components/qimela/ResultsComparison/ComparisonCard";
import { useAuth } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useQimelaPhases } from "@/hooks/useQimelaPhases";
import { useQimelaResults } from "@/hooks/useQimelaResults";
import { useQimelaContext } from "@/context/QimelaContext";
import { useQimelas } from "@/hooks/useQimelas";
import styles from "./page.module.scss";

export default function QimelaResultsPage() {
  const params = useParams<{ id: string }>();
  const qimelaId = typeof params.id === "string" ? params.id : null;
  const { user } = useAuth();
  const { data: qimelas } = useQimelas();
  const { selectedQimela, selectQimela } = useQimelaContext();

  const {
    data: phases,
    isLoading: phasesLoading,
    isError: phasesError,
  } = useQimelaPhases(qimelaId);
  const { data: leaderboard } = useLeaderboard(qimelaId, user?.id);

  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [compareUserIds, setCompareUserIds] = useState<string[]>([]);

  const {
    data: results,
    isLoading: resultsLoading,
    isError: resultsError,
  } = useQimelaResults(qimelaId, selectedPhaseId, compareUserIds);

  useEffect(() => {
    if (!qimelaId) return;
    if (selectedQimela?.id === qimelaId) return;
    const current = qimelas?.data.find((q) => q.id === qimelaId);
    if (current) {
      selectQimela(current, current.role);
    }
  }, [qimelaId, qimelas, selectedQimela?.id, selectQimela]);

  const userOptions = useMemo<CompareUserOption[]>(() => {
    if (!leaderboard || !user) return [];
    return leaderboard
      .filter((entry) => entry.userId !== user.id)
      .map((entry) => ({
        userId: entry.userId,
        userName: entry.userName,
        initials: entry.initials,
      }));
  }, [leaderboard, user]);

  function clearAllFilters() {
    setSelectedPhaseId(null);
    setCompareUserIds([]);
  }

  const hasActiveFilters = selectedPhaseId !== null || compareUserIds.length > 0;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Resultados</h1>
        </div>
        <Link className={styles.link} href="/dashboard">
          Volver
        </Link>
      </div>

      <div className={styles.filters}>
        <PhaseFilter
          phases={phases ?? []}
          selectedPhaseId={selectedPhaseId}
          onChange={setSelectedPhaseId}
          disabled={phasesLoading}
        />
        <UserCompareSelector
          options={userOptions}
          selectedUserIds={compareUserIds}
          onChange={setCompareUserIds}
        />
        {hasActiveFilters && (
          <button
            type="button"
            className={styles.clearAll}
            onClick={clearAllFilters}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {phasesError && (
        <div className={styles.state}>No se pudieron cargar las fases.</div>
      )}

      {!selectedPhaseId && !phasesLoading && (
        <div className={styles.state}>
          Selecciona una fase para ver los resultados.
        </div>
      )}

      {selectedPhaseId && resultsLoading && (
        <div className={styles.state}>Cargando resultados...</div>
      )}

      {selectedPhaseId && resultsError && (
        <div className={styles.state}>
          No se pudieron cargar los resultados.
        </div>
      )}

      {selectedPhaseId &&
        !resultsLoading &&
        !resultsError &&
        results &&
        results.length === 0 && (
          <div className={styles.state}>
            No hay partidos en esta fase.
          </div>
        )}

      {selectedPhaseId && results && results.length > 0 && user && (
        <>
          <p className={styles.summary}>
            <strong>{results[0].phaseName}</strong>, comparando resultados entre{" "}
            <strong>{user.name}</strong>
            {compareUserIds.length > 0 && (
              <>
                {" y "}
                {userOptions
                  .filter((opt) => compareUserIds.includes(opt.userId))
                  .map((opt) => opt.userName)
                  .join(", ")}
              </>
            )}
            .
          </p>
          <div className={styles.list}>
            {results.map((session) => (
              <ComparisonCard
                key={session.id}
                session={session}
                currentUserId={user.id}
                qimelaId={qimelaId!}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
