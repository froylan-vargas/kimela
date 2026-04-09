"use client";

import { useQimelaContext } from "@/context/QimelaContext";
import ParticipantDashboard from "@/components/dashboard/ParticipantDashboard";
import CreatorDashboard from "@/components/dashboard/CreatorDashboard";
import styles from "./page.module.scss";

export default function Home() {
  const { selectedQimela, viewAs } = useQimelaContext();

  return (
    <main className={styles.dashboard}>
      {selectedQimela && viewAs === "SUBSCRIBER" && (
        <ParticipantDashboard qimela={selectedQimela} />
      )}
      {selectedQimela && viewAs === "CREATOR" && (
        <CreatorDashboard qimela={selectedQimela} />
      )}
      {!selectedQimela && (
        <p className={styles.empty}>Select a qimela to get started.</p>
      )}
    </main>
  );
}
