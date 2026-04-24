"use client";

import type { ComparisonSession } from "@/lib/apiClient";
import styles from "./ComparisonCard.module.scss";

interface ComparisonCardProps {
  session: ComparisonSession;
  currentUserId: string;
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

export default function ComparisonCard({ session, currentUserId }: ComparisonCardProps) {
  const { home, away, actualResult, users } = session;

  const sortedUsers = [...users].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return 0;
  });

  return (
    <article className={styles.card}>
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
        <div className={styles.score}>
          <span className={styles.scoreValue}>{formatScore(actualResult.homeScore)}</span>
          <span className={styles.separator} aria-hidden="true">
            -
          </span>
          <span className={styles.scoreValue}>{formatScore(actualResult.awayScore)}</span>
        </div>
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
    </article>
  );
}
