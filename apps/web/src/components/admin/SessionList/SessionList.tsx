"use client";

import type { Session } from "@/types/session";
import styles from "./SessionList.module.scss";

interface SessionListProps {
  sessions: Session[];
  isLoading: boolean;
  isError: boolean;
}

function formatScheduledAt(iso: string): string {
  const date = new Date(iso);
  // Use timeZone: "UTC" so the displayed time matches the hora from the CSV,
  // which is stored as-is (no timezone conversion applied on upload).
  const datePart = date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${datePart} · ${hours}:${minutes}`;
}

interface ContenderAvatarProps {
  name: string;
  imgUrl: string | null;
}

function ContenderAvatar({ name, imgUrl }: ContenderAvatarProps) {
  return (
    <div className={styles.avatar}>
      {imgUrl ? (
        // Remote contender images come from arbitrary catalog URLs, so we intentionally
        // render them directly instead of forcing Next Image remote configuration here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt={name} className={styles.avatarImg} />
      ) : (
        <span className={styles.avatarFallback} aria-hidden="true" />
      )}
    </div>
  );
}

export default function SessionList({
  sessions,
  isLoading,
  isError,
}: SessionListProps) {
  if (isLoading) {
    return (
      <div className={styles.skeletonList} aria-label="Cargando partidos">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className={styles.error}>
        Error al cargar los partidos. Intenta de nuevo.
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className={styles.empty}>
        No hay partidos en esta fase. Carga un archivo CSV para agregar partidos.
      </p>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return (
    <ul className={styles.list}>
      {sorted.map((session) => (
        <li key={session.id} className={styles.card}>
          <div className={styles.matchup}>
            <div className={styles.contender}>
              <ContenderAvatar name={session.home.name} imgUrl={session.home.imgUrl} />
              <span className={styles.contenderName}>{session.home.name}</span>
            </div>

            <span className={styles.vs}>vs</span>

            <div className={`${styles.contender} ${styles.contenderAway}`}>
              <ContenderAvatar name={session.away.name} imgUrl={session.away.imgUrl} />
              <span className={styles.contenderName}>{session.away.name}</span>
            </div>
          </div>

          <time
            className={styles.date}
            dateTime={session.scheduledAt}
          >
            {formatScheduledAt(session.scheduledAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
