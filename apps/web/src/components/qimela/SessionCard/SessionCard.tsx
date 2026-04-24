"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import { useSavePrediction } from "@/hooks/useSavePrediction";
import type { PredictionPick, SessionPrediction } from "@/types/prediction";
import styles from "./SessionCard.module.scss";

const PICKS_DEADLINE_MS = 3 * 60 * 1000;

function isValidScore(value: string) {
  if (!/^\d+$/.test(value)) return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 99;
}

function getScorePick(
  picks: PredictionPick[],
  key: "score_home" | "score_away",
) {
  return picks.find((pick) => pick.name === key) ?? null;
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function formatScheduledAt(dateString: string) {
  // Sessions are stored as UTC without timezone conversion on CSV upload,
  // so render in UTC to match the hora the admin provided.
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(dateString));
}

interface SessionCardProps {
  session: SessionPrediction;
  qimelaId: string;
  showPhaseName?: boolean;
}

export default function SessionCard({
  session,
  qimelaId,
  showPhaseName: _showPhaseName = true,
}: SessionCardProps) {
  const { toast } = useToast();
  const savePrediction = useSavePrediction(qimelaId);
  const homePick = useMemo(
    () => getScorePick(session.picks, "score_home"),
    [session.picks],
  );
  const awayPick = useMemo(
    () => getScorePick(session.picks, "score_away"),
    [session.picks],
  );
  const [homeScore, setHomeScore] = useState(homePick?.value ?? "");
  const [awayScore, setAwayScore] = useState(awayPick?.value ?? "");
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    setHomeScore(homePick?.value ?? "");
  }, [homePick?.value]);

  useEffect(() => {
    setAwayScore(awayPick?.value ?? "");
  }, [awayPick?.value]);

  useEffect(() => {
    setCurrentTime(Date.now());

    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const isTooClose =
    currentTime !== null &&
    new Date(session.scheduledAt).getTime() - currentTime < PICKS_DEADLINE_MS;
  const hasSavedPrediction = session.hasUserPicks;
  const hasRequiredCategories = !!homePick && !!awayPick;
  const isValid = isValidScore(homeScore) && isValidScore(awayScore);
  const isDisabled =
    savePrediction.isPending ||
    isTooClose ||
    !isValid ||
    !hasRequiredCategories;

  async function handleSave() {
    if (!homePick || !awayPick || !isValid) {
      return;
    }

    try {
      await savePrediction.mutateAsync({
        sessionId: session.id,
        picks: [
          { pickCategoryId: homePick.pickCategoryId, value: homeScore },
          { pickCategoryId: awayPick.pickCategoryId, value: awayScore },
        ],
      });
      toast(
        hasSavedPrediction
          ? "Pronóstico actualizado correctamente."
          : "Pronóstico guardado correctamente.",
        "success",
      );
    } catch (err) {
      toast(toUserMessage(err), "error");
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <p className={styles.date}>
            {formatScheduledAt(session.scheduledAt)}
          </p>
        </div>

        {hasSavedPrediction && (
          <p className={styles.savedNotice}>Guardado, aún puedes editar</p>
        )}
      </div>

      <div className={styles.teams}>
        <div className={styles.team}>
          <div className={styles.logo}>
            {session.home.imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.home.imgUrl} alt={session.home.name} />
            ) : (
              <span className={styles.logoFallback}>
                {getInitials(session.home.name)}
              </span>
            )}
          </div>
          <span className={styles.teamName}>{session.home.name}</span>
        </div>

        <div className={styles.scores}>
          <input
            className={styles.scoreInput}
            inputMode="numeric"
            aria-label={`Marcador ${session.home.name}`}
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
            maxLength={2}
          />
          <span className={styles.separator}>-</span>
          <input
            className={styles.scoreInput}
            inputMode="numeric"
            aria-label={`Marcador ${session.away.name}`}
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
            maxLength={2}
          />
        </div>

        <div className={`${styles.team} ${styles.teamAway}`}>
          <span className={styles.teamName}>{session.away.name}</span>
          <div className={styles.logo}>
            {session.away.imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.away.imgUrl} alt={session.away.name} />
            ) : (
              <span className={styles.logoFallback}>
                {getInitials(session.away.name)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        {!hasRequiredCategories && (
          <p className={styles.warning}>
            Esta sesión no tiene categorías de marcador configuradas.
          </p>
        )}
        {isTooClose && (
          <p className={styles.warning}>
            Ya no puedes guardar pronósticos para sesiones que empiezan en menos
            de 3 minutos.
          </p>
        )}
        <button
          type="button"
          className={`${styles.button} ${hasSavedPrediction ? styles.buttonSaved : ""}`}
          disabled={isDisabled}
          onClick={handleSave}
        >
          {savePrediction.isPending
            ? "Guardando..."
            : hasSavedPrediction
              ? "Actualizar"
              : "Guardar"}
        </button>
      </div>
    </article>
  );
}
