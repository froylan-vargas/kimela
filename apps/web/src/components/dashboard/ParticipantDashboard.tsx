"use client";

import { useState } from "react";
import type { Qimela } from "@/types/qimela";
import TablePositions from "@/components/dashboard/TablePositions";
import { getPositionsSummary } from "@/components/dashboard/TablePositions";
import UpcomingSessions from "@/components/qimela/UpcomingSessions/UpcomingSessions";
import styles from "./ParticipantDashboard.module.scss";

interface ParticipantDashboardProps {
  qimela: Qimela;
}

export default function ParticipantDashboard({
  qimela,
}: ParticipantDashboardProps) {
  const [activeMobilePanel, setActiveMobilePanel] = useState<
    "sessions" | "positions"
  >("sessions");
  const { currentUser, openPredictions } = getPositionsSummary();

  return (
    <section className={styles.layout}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Vista del participante</p>
        <h1>{qimela.name}</h1>
        <p>
          Revisa tu lugar en la tabla y los próximos partidos que todavía
          puedes pronosticar.
        </p>
      </div>
      {currentUser && (
        <div className={styles.mobileSummary}>
          <span>
            Tu posición: <strong>{currentUser.rank}</strong>
          </span>
          <span>
            <strong>{currentUser.points} pts</strong>
          </span>
          <span>
            <strong>{openPredictions}</strong> abiertos
          </span>
        </div>
      )}
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
          <TablePositions qimelaName={qimela.name} />
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
