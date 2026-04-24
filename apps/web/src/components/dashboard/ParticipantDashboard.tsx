"use client";

import { useState } from "react";
import type { Qimela } from "@/types/qimela";
import TablePositions from "@/components/dashboard/TablePositions";
import UpcomingSessions from "@/components/qimela/UpcomingSessions/UpcomingSessions";
import { useAuth } from "@/hooks/useAuth";
import { useLeaderboard } from "@/hooks/useLeaderboard";
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
  const { user } = useAuth();
  const { data: leaderboard } = useLeaderboard(qimela.id, user?.id);
  const currentEntry = leaderboard?.find((entry) => entry.isCurrentUser);

  return (
    <section className={styles.layout}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryPrimary}>
          <h1>{qimela.name}</h1>
        </div>
        <div className={styles.summaryDivider} aria-hidden="true" />
        <div className={styles.summaryStats}>
          <div className={styles.summaryUser}>
            <span className={styles.summaryLabel}>Usuario</span>
            <span className={styles.summaryValue}>
              {currentEntry?.userName ?? user?.name ?? "Sin registro"}
            </span>
          </div>
          <div className={styles.summaryMetric}>
            <span className={styles.summaryLabel}>Pos</span>
            <span className={styles.summaryRank}>
              {currentEntry?.rank ?? "-"}
            </span>
          </div>
          <div className={styles.summaryMetric}>
            <span className={styles.summaryLabel}>Puntos</span>
            <span className={styles.summaryPoints}>
              {currentEntry?.totalPoints ?? 0}
            </span>
          </div>
        </div>
      </div>
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
