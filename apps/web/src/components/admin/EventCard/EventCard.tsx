"use client";

import Link from "next/link";
import type { SportEvent } from "@/types/event";
import styles from "./EventCard.module.scss";

interface EventCardProps {
  event: SportEvent;
  sessionFormat: "Enfrentamiento" | "Carrera";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventCard({ event, sessionFormat }: EventCardProps) {
  const managePath = `/admin/events/${event.id}?name=${encodeURIComponent(event.name)}`;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span
          className={`${styles.badge} ${sessionFormat === "Carrera" ? styles.badgeRace : styles.badgeMatchup}`}
        >
          {sessionFormat}
        </span>
        <span className={styles.league}>{event.leagueName}</span>
      </div>

      <h2 className={styles.name}>{event.name}</h2>

      <p className={styles.dates}>
        {formatDate(event.startsAt)}
        {event.endsAt ? ` – ${formatDate(event.endsAt)}` : ""}
      </p>

      <Link href={managePath} className={styles.manageBtn}>
        Administrar
      </Link>
    </div>
  );
}
