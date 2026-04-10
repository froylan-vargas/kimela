"use client";

import { useState } from "react";
import SportSelect from "@/components/admin/SportSelect/SportSelect";
import EventList from "@/components/admin/EventList/EventList";
import type { SessionFormat } from "@/types/sport";
import styles from "./page.module.scss";

export default function AdminEventsPage() {
  const [selectedSport, setSelectedSport] = useState<{
    id: string;
    sessionFormat: SessionFormat;
  } | null>(null);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Eventos activos</h1>
        <p className={styles.subtitle}>
          Selecciona un deporte para ver sus eventos activos.
        </p>
      </div>

      <section className={styles.controls}>
        <SportSelect
          value={selectedSport?.id ?? null}
          onChange={(id, sessionFormat) => setSelectedSport({ id, sessionFormat })}
        />
      </section>

      {selectedSport && (
        <section className={styles.results}>
          <EventList
            sportId={selectedSport.id}
            sessionFormat={selectedSport.sessionFormat}
          />
        </section>
      )}
    </main>
  );
}
