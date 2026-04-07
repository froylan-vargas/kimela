"use client";

import { useKimelaContext } from "@/context/KimelaContext";
import ParticipantDashboard from "@/components/dashboard/ParticipantDashboard";
import CreatorDashboard from "@/components/dashboard/CreatorDashboard";
import styles from "./page.module.scss";

export default function Home() {
  const { selectedKimela, viewAs } = useKimelaContext();

  return (
    <main className={styles.dashboard}>
      {selectedKimela && viewAs === "SUBSCRIBER" && (
        <ParticipantDashboard kimela={selectedKimela} />
      )}
      {selectedKimela && viewAs === "CREATOR" && (
        <CreatorDashboard kimela={selectedKimela} />
      )}
      {!selectedKimela && (
        <p className={styles.empty}>Select a kimela to get started.</p>
      )}
    </main>
  );
}
