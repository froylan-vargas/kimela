"use client";

import { useState } from "react";
import type { ComparisonSession } from "@/lib/apiClient";
import Top5Modal from "@/components/qimela/Top5Modal/Top5Modal";
import styles from "./ComparisonCard.module.scss";

interface ComparisonCardProps {
  session: ComparisonSession;
  currentUserId: string;
  qimelaId: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatScore(value: string | null) {
  return value ?? "-";
}

function formatPickScore(home: string | null, away: string | null) {
  if (home === null && away === null) return "-";
  return `${home ?? "-"} - ${away ?? "-"}`;
}

function formatPoints(points: number | null) {
  if (points === null) return "-";
  return `${points > 0 ? "+" : ""}${points} Pts`;
}

function parseFloatingDate(dateString: string) {
  return new Date(dateString.endsWith("Z") ? dateString : `${dateString}Z`);
}

function getMexicoDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function getUtcDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMatchDate(dateString: string) {
  const date = parseFloatingDate(dateString);
  const time = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h12",
    timeZone: "UTC",
  }).format(date);

  if (getUtcDateKey(date) === getMexicoDateKey(new Date())) return `HOY, ${time}`;

  const dateParts = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(date);
  const values = new Map(dateParts.map((part) => [part.type, part.value]));
  const weekday = values.get("weekday") ?? "";
  const day = values.get("day") ?? "";
  const month = values.get("month") ?? "";

  return `${weekday} ${day} de ${month}, ${time}`;
}

export default function ComparisonCard({ session, currentUserId, qimelaId }: ComparisonCardProps) {
  const { home, away, actualResult, users } = session;
  const [top5Open, setTop5Open] = useState(false);

  const hasOfficialResult =
    actualResult.homeScore !== null && actualResult.awayScore !== null;

  const sortedUsers = [...users].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });

  return (
    <article className={styles.card}>
      <time className={styles.matchDate} dateTime={session.scheduledAt}>
        {formatMatchDate(session.scheduledAt)}
      </time>
      <div className={styles.actual}>
        <div className={styles.team}>
          <div className={styles.logo}>
            {home.imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={home.imgUrl} alt={home.name} />
            ) : (
              <span className={styles.logoFallback}>{getInitials(home.name)}</span>
            )}
          </div>
          <span className={styles.teamName}>{home.name}</span>
        </div>
        {hasOfficialResult ? (
          <div className={styles.score}>
            <span className={styles.scoreValue}>{formatScore(actualResult.homeScore)}</span>
            <span className={styles.separator} aria-hidden="true">
              -
            </span>
            <span className={styles.scoreValue}>{formatScore(actualResult.awayScore)}</span>
          </div>
        ) : (
          <div className={styles.pendingArea}>
            <div className={`${styles.score} ${styles.scorePending}`}>
              Aún sin resultado
            </div>
            <button
              type="button"
              className={styles.top5Btn}
              onClick={() => setTop5Open(true)}
              aria-label="Ver pronósticos Top 5"
            >
              Top 5
            </button>
          </div>
        )}
        <div className={`${styles.team} ${styles.teamAway}`}>
          <span className={styles.teamName}>{away.name}</span>
          <div className={styles.logo}>
            {away.imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={away.imgUrl} alt={away.name} />
            ) : (
              <span className={styles.logoFallback}>{getInitials(away.name)}</span>
            )}
          </div>
        </div>
      </div>

      <ul className={styles.users}>
        {sortedUsers.map((user) => {
          const isCurrent = user.userId === currentUserId;
          const label = isCurrent ? "Tú" : user.userName;
          const pickText = formatPickScore(user.homePick, user.awayPick);
          return (
            <li key={user.userId} className={`${styles.userRow} ${isCurrent ? styles.userRowCurrent : ""}`}>
              <span className={styles.userLabel}>{label}:</span>
              <span className={styles.userPick}>{pickText}</span>
              <span
                className={`${styles.userPoints} ${
                  user.points && user.points > 0 ? styles.userPointsPositive : ""
                }`}
              >
                {formatPoints(user.points)}
              </span>
            </li>
          );
        })}
      </ul>

      {top5Open && (
        <Top5Modal
          open={top5Open}
          onClose={() => setTop5Open(false)}
          qimelaId={qimelaId}
          sessionId={session.id}
          phaseId={session.phaseId}
          home={home}
          away={away}
        />
      )}
    </article>
  );
}
