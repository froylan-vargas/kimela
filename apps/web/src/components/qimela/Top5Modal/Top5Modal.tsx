"use client";

import { useEffect, useRef } from "react";
import { useSessionTop5Picks } from "@/hooks/useSessionTop5Picks";
import type { Top5PickEntry, ComparisonContender } from "@/lib/apiClient";
import styles from "./Top5Modal.module.scss";

interface Props {
  open: boolean;
  onClose: () => void;
  qimelaId: string;
  sessionId: string;
  phaseId: string;
  home: ComparisonContender;
  away: ComparisonContender;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPick(home: string | null, away: string | null) {
  if (home === null && away === null) return "Sin pronóstico";
  return `${home ?? "-"} - ${away ?? "-"}`;
}

function Section({
  title,
  entries,
  loading,
}: {
  title: string;
  entries: Top5PickEntry[];
  loading: boolean;
}) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {loading ? (
        <p className={styles.empty}>Cargando...</p>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>Sin datos disponibles.</p>
      ) : (
        <ol className={styles.list}>
          {entries.map((entry) => (
            <li key={entry.userId} className={styles.row}>
              <span className={styles.rank}>#{entry.rank}</span>
              <span className={styles.name}>{entry.userName}</span>
              <span className={styles.pick}>
                {formatPick(entry.homePick, entry.awayPick)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function Top5Modal({
  open,
  onClose,
  qimelaId,
  sessionId,
  phaseId,
  home,
  away,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { data, isLoading } = useSessionTop5Picks(
    qimelaId,
    sessionId,
    phaseId,
    open,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      onClose();
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.titleLabel}>Pronósticos Top 5</span>
            <div className={styles.matchup}>
              <div className={styles.contender}>
                {home.imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={home.imgUrl} alt={home.name} className={styles.teamLogo} />
                ) : (
                  <span className={styles.teamLogoFallback}>{getInitials(home.name)}</span>
                )}
                <span className={styles.teamName}>{home.name}</span>
              </div>
              <span className={styles.vs}>vs</span>
              <div className={`${styles.contender} ${styles.contenderAway}`}>
                {away.imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={away.imgUrl} alt={away.name} className={styles.teamLogo} />
                ) : (
                  <span className={styles.teamLogoFallback}>{getInitials(away.name)}</span>
                )}
                <span className={styles.teamName}>{away.name}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Cerrar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <Section
            title="General"
            entries={data?.overall ?? []}
            loading={isLoading}
          />
          {data?.phase !== null && (
            <Section
              title="Fase actual"
              entries={data?.phase ?? []}
              loading={isLoading}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}
