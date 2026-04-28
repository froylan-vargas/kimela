"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUpcomingSessions } from "@/hooks/useUpcomingSessions";
import SessionCard from "@/components/qimela/SessionCard/SessionCard";
import styles from "./UpcomingSessions.module.scss";

interface UpcomingSessionsProps {
  qimelaId: string;
}

export default function UpcomingSessions({ qimelaId }: UpcomingSessionsProps) {
  const { data, isLoading, isError } = useUpcomingSessions(qimelaId);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const hasAnySessions = !!data?.some((group) => group.sessions.length > 0);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Próximos partidos</h2>
        </div>
        <Link className={styles.link} href={`/qimela/${qimelaId}/sessions`}>
          Ver todos
        </Link>
      </div>

      {isLoading && <div className={styles.state}>Cargando partidos...</div>}
      {isError && (
        <div className={styles.state}>
          No se pudieron cargar los partidos disponibles.
        </div>
      )}
      {!isLoading && !isError && !hasAnySessions && (
        <div className={styles.state}>
          No hay partidos disponibles para pronosticar en este momento.
        </div>
      )}

      {hasAnySessions && (
        <div className={styles.groups}>
          {data!.map((group) => (
            <section key={group.phaseId} className={styles.group}>
              <div className={styles.groupHeader}>
                <h3>{group.phaseName}</h3>
              </div>
              <div className={styles.stack}>
                {group.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    qimelaId={qimelaId}
                    currentTime={currentTime}
                    showPhaseName={false}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
