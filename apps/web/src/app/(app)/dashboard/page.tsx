"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { useQimelaContext } from "@/context/QimelaContext";
import { useQimelas } from "@/hooks/useQimelas";
import { resolveQimelaLandingTarget } from "@/lib/qimelaNavigation";
import ParticipantDashboard from "@/components/dashboard/ParticipantDashboard";
import CreatorDashboard from "@/components/dashboard/CreatorDashboard";
import styles from "./page.module.scss";

export default function Home() {
  const { user } = useAuthContext();
  const { selectedQimela, viewAs, selectQimela, clearQimela } =
    useQimelaContext();
  const { data, isLoading } = useQimelas();
  const router = useRouter();
  const hasSubscribedQimelas =
    data?.data.some((qimela) => qimela.role === "SUBSCRIBER") ?? false;

  useEffect(() => {
    if (isLoading || selectedQimela) return;

    const target = resolveQimelaLandingTarget(user, data);

    if (target.qimela && target.viewAs) {
      selectQimela(target.qimela, target.viewAs);
    } else {
      clearQimela();
    }

    if (target.href !== "/dashboard") {
      router.replace(target.href);
    }
  }, [
    clearQimela,
    data,
    isLoading,
    router,
    selectQimela,
    selectedQimela,
    user,
  ]);

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
