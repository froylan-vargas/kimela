"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import type { Session } from "@/types/session";
import styles from "./SessionResultsEditor.module.scss";

interface SessionResultsEditorProps {
  eventId: string;
  phaseId: string;
  sessions: Session[];
  isLoading: boolean;
  isError: boolean;
  isPhaseActive: boolean;
}

interface ResultDraft {
  home: string;
  away: string;
}

function formatScheduledAt(value: string) {
  // Sessions are stored as UTC without timezone conversion on CSV upload,
  // so render in UTC to match the hora the admin provided.
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function buildInitialDrafts(sessions: Session[]): Record<string, ResultDraft> {
  return Object.fromEntries(
    sessions.map((session) => [
      session.id,
      {
        home: session.score.home ?? "",
        away: session.score.away ?? "",
      },
    ]),
  );
}

interface ContenderAvatarProps {
  name: string;
  imgUrl: string | null;
}

function ContenderAvatar({ name, imgUrl }: ContenderAvatarProps) {
  return (
    <div className={styles.avatar}>
      {imgUrl ? (
        // Remote contender images come from arbitrary catalog URLs, so we intentionally
        // render them directly instead of forcing Next Image remote configuration here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgUrl} alt={name} className={styles.avatarImg} />
      ) : (
        <span className={styles.avatarFallback} aria-hidden="true" />
      )}
    </div>
  );
}

function isValidResultValue(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  return parsed >= 0 && parsed < 100;
}

function normalizeResultInput(value: string): string | null {
  if (value === "") return "";
  if (!/^\d+$/.test(value)) return null;
  if (value.length > 2) return null;

  const parsed = Number(value);
  if (parsed < 0 || parsed >= 100) return null;

  return value;
}

export default function SessionResultsEditor({
  eventId,
  phaseId,
  sessions,
  isLoading,
  isError,
  isPhaseActive,
}: SessionResultsEditorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const completedDelta =
          Number(a.status === "COMPLETED") - Number(b.status === "COMPLETED");
        if (completedDelta !== 0) return completedDelta;

        return (
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      }),
    [sessions],
  );

  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>(() =>
    buildInitialDrafts(sessions),
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(buildInitialDrafts(sessions));
  }, [sessions]);

  function updateDraft(
    sessionId: string,
    side: keyof ResultDraft,
    value: string,
  ) {
    const normalizedValue = normalizeResultInput(value);
    if (normalizedValue === null) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [sessionId]: {
        ...(current[sessionId] ?? { home: "", away: "" }),
        [side]: normalizedValue,
      },
    }));
  }

  async function handleSave(sessionId: string) {
    const draft = drafts[sessionId];
    if (!draft) return;

    setSavingId(sessionId);
    try {
      await adminApi.saveSessionResults(eventId, phaseId, sessionId, draft.home, draft.away);
      await queryClient.invalidateQueries({ queryKey: ["admin", "sessions", eventId, phaseId] });
      toast("Resultado guardado correctamente.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setSavingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.skeletonList} aria-label="Cargando resultados">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className={styles.error}>
        Error al cargar los partidos. Intenta de nuevo.
      </p>
    );
  }

  if (sortedSessions.length === 0) {
    return (
      <p className={styles.empty}>
        No hay partidos en esta fase. Carga un archivo CSV para capturar
        resultados.
      </p>
    );
  }

  return (
    <div className={styles.wrapper}>
      <ul className={styles.list}>
        {sortedSessions.map((session) => {
          const draft = drafts[session.id] ?? { home: "", away: "" };
          const isCompleted = session.status === "COMPLETED";
          const isSaving = savingId === session.id;
          const canSave =
            !isCompleted &&
            isPhaseActive &&
            !isSaving &&
            isValidResultValue(draft.home) &&
            isValidResultValue(draft.away);

          return (
            <li
              key={session.id}
              className={`${styles.card} ${isCompleted ? styles.cardCompleted : ""}`}
            >
              <div className={styles.header}>
                <p className={styles.scheduledAt}>
                  {formatScheduledAt(session.scheduledAt)}
                </p>
              </div>

              {isCompleted && (
                <p className={styles.completedNotice}>Resultado final registrado</p>
              )}

              <div className={styles.matchup}>
                <div className={styles.contender}>
                  <div className={styles.contenderInfo}>
                    <ContenderAvatar
                      name={session.home.name}
                      imgUrl={session.home.imgUrl}
                    />
                    <span className={styles.contenderName}>
                      {session.home.name}
                    </span>
                  </div>
                </div>

                <div className={styles.scoreboard}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={styles.input}
                    placeholder="0"
                    aria-label={`Resultado de ${session.home.name}`}
                    value={draft.home}
                    disabled={isCompleted || isSaving}
                    maxLength={2}
                    onChange={(event) =>
                      updateDraft(session.id, "home", event.target.value)
                    }
                  />
                  <span className={styles.separator} aria-hidden="true">
                    -
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={styles.input}
                    placeholder="0"
                    aria-label={`Resultado de ${session.away.name}`}
                    value={draft.away}
                    disabled={isCompleted || isSaving}
                    maxLength={2}
                    onChange={(event) =>
                      updateDraft(session.id, "away", event.target.value)
                    }
                  />
                </div>

                <div className={`${styles.contender} ${styles.contenderAway}`}>
                  <div className={styles.contenderInfo}>
                    <ContenderAvatar
                      name={session.away.name}
                      imgUrl={session.away.imgUrl}
                    />
                    <span className={styles.contenderName}>
                      {session.away.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.saveButton}
                  disabled={!canSave}
                  onClick={() => handleSave(session.id)}
                >
                  {isCompleted ? "Completado" : isSaving ? "Guardando..." : "Guardar resultados"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
