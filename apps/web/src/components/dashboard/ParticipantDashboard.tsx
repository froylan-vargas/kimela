"use client";

import type { Qimela } from "@/types/qimela";
import UpcomingSessions from "@/components/qimela/UpcomingSessions/UpcomingSessions";
import styles from "./ParticipantDashboard.module.scss";

interface ParticipantDashboardProps {
  qimela: Qimela;
}

export default function ParticipantDashboard({ qimela }: ParticipantDashboardProps) {
  return (
    <section className={styles.layout}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Qimela activa</p>
        <h1>{qimela.name}</h1>
        <p>
          Registra tus marcadores uno por uno. Cada guardado se aplica solo al
          partido que estás editando.
        </p>
      </div>
      <UpcomingSessions qimelaId={qimela.id} />
    </section>
  );
}
