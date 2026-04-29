"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SessionCard from "@/components/qimela/SessionCard/SessionCard";
import { useQimelaContext } from "@/context/QimelaContext";
import { useQimelas } from "@/hooks/useQimelas";
import { useAllQimelaSessions } from "@/hooks/useUpcomingSessions";
import styles from "./page.module.scss";

function useCurrentTime(intervalMs = 30_000): number {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return currentTime;
}

type PicksFilter = "pending" | "registered";

export default function QimelaSessionsPage() {
  const params = useParams<{ id: string }>();
  const qimelaId = typeof params.id === "string" ? params.id : null;
  const { data: qimelas } = useQimelas();
  const { selectedQimela, selectQimela } = useQimelaContext();
  const { data, isLoading, isError } = useAllQimelaSessions(qimelaId);
  const [filter, setFilter] = useState<PicksFilter>("pending");
  const currentTime = useCurrentTime();

  useEffect(() => {
    if (!qimelaId) return;
    if (selectedQimela?.id === qimelaId) return;

    const currentQimela = qimelas?.data.find(
      (qimela) => qimela.id === qimelaId,
    );
    if (currentQimela) {
      selectQimela(currentQimela, currentQimela.role);
    }
  }, [qimelaId, qimelas, selectQimela, selectedQimela?.id]);

  const filteredGroups = useMemo(() => {
    if (!data) return [];
    return data
      .map((group) => ({
        ...group,
        sessions: group.sessions.filter((session) => {
          if (session.status === "COMPLETED") return false;
          return filter === "pending" ? !session.hasUserPicks : session.hasUserPicks;
        }),
      }))
      .filter((group) => group.sessions.length > 0);
  }, [data, filter]);

  const hasAnySessions = !!data?.some((group) =>
    group.sessions.some((s) => s.status !== "COMPLETED"),
  );

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Próximos patidos</h1>
        </div>
        <Link className={styles.link} href="/dashboard">
          Volver
        </Link>
      </div>
      <div className={styles.headerDivider} aria-hidden="true" />

      <div
        className={styles.filters}
        role="group"
        aria-label="Filtro de partidos"
      >
        <button
          type="button"
          className={`${styles.filter} ${styles.filterPending} ${
            filter === "pending" ? styles.filterActive : ""
          }`}
          aria-pressed={filter === "pending"}
          onClick={() => setFilter("pending")}
        >
          Por registrar
        </button>
        <button
          type="button"
          className={`${styles.filter} ${styles.filterRegistered} ${
            filter === "registered" ? styles.filterActive : ""
          }`}
          aria-pressed={filter === "registered"}
          onClick={() => setFilter("registered")}
        >
          Partidos ya registrados
        </button>
      </div>

      {isLoading && <div className={styles.state}>Cargando partidos...</div>}
      {isError && (
        <div className={styles.state}>No se pudieron cargar los partidos.</div>
      )}
      {!isLoading && !isError && !hasAnySessions && (
        <div className={styles.state}>
          No hay partidos disponibles para mostrar.
        </div>
      )}
      {!isLoading &&
        !isError &&
        hasAnySessions &&
        filteredGroups.length === 0 && (
          <div className={styles.state}>
            {filter === "pending"
              ? "No hay partidos por registrar."
              : "Todavía no has registrado pronósticos."}
          </div>
        )}

      {filteredGroups.length > 0 && (
        <div className={styles.groups}>
          {filteredGroups.map((group) => (
            <section key={group.phaseId} className={styles.group}>
              <div className={styles.groupHeader}>
                <h2>{group.phaseName}</h2>
              </div>
              <div className={styles.stack}>
                {group.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    qimelaId={qimelaId!}
                    currentTime={currentTime}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
