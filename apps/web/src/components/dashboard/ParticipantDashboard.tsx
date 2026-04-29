"use client";

import { useState } from "react";
import type { qimela } from "@/types/qimela";
import TablePositions from "@/components/dashboard/TablePositions";
import UpcomingSessions from "@/components/qimela/UpcomingSessions/UpcomingSessions";
import { useAuth } from "@/hooks/useAuth";
import styles from "./ParticipantDashboard.module.scss";

interface ParticipantDashboardProps {
  qimela: qimela;
}

export default function ParticipantDashboard({
  qimela,
}: ParticipantDashboardProps) {
  const [activeMobilePanel, setActiveMobilePanel] = useState<
    "sessions" | "positions"
  >("sessions");
  const { user } = useAuth();

  return (
    <section className={styles.layout}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryPrimary}>
          <h1>{qimela.name}</h1>
        </div>
      </div>
      <div className={styles.headerDivider} aria-hidden="true" />
      <div
        className={styles.mobileSwitch}
        role="tablist"
        aria-label="Vista del participante"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMobilePanel === "sessions"}
          className={`${styles.mobileTab} ${
            activeMobilePanel === "sessions" ? styles.mobileTabActive : ""
          }`}
          onClick={() => setActiveMobilePanel("sessions")}
        >
          Partidos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMobilePanel === "positions"}
          className={`${styles.mobileTab} ${
            activeMobilePanel === "positions" ? styles.mobileTabActive : ""
          }`}
          onClick={() => setActiveMobilePanel("positions")}
        >
          Posiciones
        </button>
      </div>
      <div className={styles.content}>
        <div
          className={`${styles.panel} ${
            activeMobilePanel === "positions" ? styles.panelMobileVisible : ""
          }`}
        >
          <TablePositions qimelaId={qimela.id} currentUserId={user?.id} />
        </div>
        <div
          className={`${styles.panel} ${
            activeMobilePanel === "sessions" ? styles.panelMobileVisible : ""
          }`}
        >
          <UpcomingSessions qimelaId={qimela.id} />
        </div>
      </div>
    </section>
  );
}
