"use client";

import { useQimelaContext } from "@/context/QimelaContext";
import { useQimelas } from "@/hooks/useQimelas";
import ParticipantDashboard from "@/components/dashboard/ParticipantDashboard";
import CreatorDashboard from "@/components/dashboard/CreatorDashboard";
import styles from "./page.module.scss";

export default function Home() {
  const { selectedQimela, viewAs } = useQimelaContext();
  const { data } = useQimelas();
  const hasSubscribedQimelas =
    data?.data.some((qimela) => qimela.role === "SUBSCRIBER") ?? false;

  return (
    <main className={styles.dashboard}>
      {selectedQimela && viewAs === "SUBSCRIBER" && (
        <ParticipantDashboard qimela={selectedQimela} />
      )}
      {selectedQimela && viewAs === "CREATOR" && (
        <CreatorDashboard qimela={selectedQimela} />
      )}
      {!selectedQimela && (
        <section className={styles.emptyState}>
          {hasSubscribedQimelas && (
            <>
              <div className={styles.selectionPrompt}>
                <p className={styles.empty}>
                  Selecciona una qimela para empezar.
                </p>
              </div>
              {/* <h1 className={styles.createHeadline}>
                ¡También puedes crear
                <span>tu propia qimela!</span>
              </h1> */}
            </>
          )}
          {!hasSubscribedQimelas && (
            <h1 className={styles.createHeadline}>
              Aún no te has suscrito a ninguna qimela 😢
              <span>¡Pide que te inviten a la quiniela del mundial!</span>
            </h1>
          )}
          {/* <HomeStepShowcase variant="dashboard" /> */}
        </section>
      )}
    </main>
  );
}
