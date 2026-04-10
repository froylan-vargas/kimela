"use client";

import { useAdminEvents } from "@/hooks/useAdminEvents";
import EventCard from "@/components/admin/EventCard/EventCard";
import styles from "./EventList.module.scss";

import type { SessionFormat } from "@/types/sport";

function toDisplayFormat(format: SessionFormat): "Enfrentamiento" | "Carrera" {
  return format === "RACE" ? "Carrera" : "Enfrentamiento";
}

interface EventListProps {
  sportId: string;
  sessionFormat: SessionFormat;
}

export default function EventList({ sportId, sessionFormat }: EventListProps) {
  const { data: events, isLoading, isError } = useAdminEvents(sportId);

  if (isLoading) {
    return (
      <div className={styles.skeletonGrid} aria-label="Cargando eventos">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className={styles.error}>Error al cargar los eventos. Intenta de nuevo.</p>;
  }

  if (!events || events.length === 0) {
    return <p className={styles.empty}>No se encontraron eventos activos para este deporte.</p>;
  }

  return (
    <div className={styles.grid}>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          sessionFormat={toDisplayFormat(sessionFormat)}
        />
      ))}
    </div>
  );
}
