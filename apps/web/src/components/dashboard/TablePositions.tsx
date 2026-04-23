import styles from "./TablePositions.module.scss";

interface TablePositionsProps {
  qimelaName: string;
}

interface PositionRow {
  rank: number;
  playerName: string;
  initials: string;
  hits: number;
  streak: string;
  points: number;
  isCurrentUser?: boolean;
}

export const MOCK_POSITIONS: PositionRow[] = [
  {
    rank: 1,
    playerName: "Ana Torres",
    initials: "AT",
    hits: 18,
    streak: "+12",
    points: 124,
  },
  {
    rank: 2,
    playerName: "Diego Ruiz",
    initials: "DR",
    hits: 17,
    streak: "+8",
    points: 118,
  },
  {
    rank: 3,
    playerName: "Froylan Vargas",
    initials: "FV",
    hits: 16,
    streak: "+6",
    points: 110,
    isCurrentUser: true,
  },
  {
    rank: 4,
    playerName: "Sofia Mena",
    initials: "SM",
    hits: 14,
    streak: "+4",
    points: 95,
  },
  {
    rank: 5,
    playerName: "Carlos Diaz",
    initials: "CD",
    hits: 13,
    streak: "+2",
    points: 88,
  },
  {
    rank: 6,
    playerName: "Laura Campos",
    initials: "LC",
    hits: 12,
    streak: "-1",
    points: 82,
  },
];

function getRankTone(rank: number) {
  if (rank === 1) return styles.rankGold;
  if (rank === 2) return styles.rankSilver;
  if (rank === 3) return styles.rankBronze;
  return "";
}

export function getPositionsSummary() {
  const leader = MOCK_POSITIONS[0];
  const currentUser = MOCK_POSITIONS.find((entry) => entry.isCurrentUser) ?? null;

  return {
    leader,
    currentUser,
    openPredictions: 3,
  };
}

export default function TablePositions({ qimelaName }: TablePositionsProps) {
  const { leader, currentUser } = getPositionsSummary();

  return (
    <section className={styles.card} aria-labelledby="table-positions-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Panorama general</p>
          <h2 className={styles.title} id="table-positions-title">
            Posiciones
          </h2>
          <p className={styles.subtitle}>
            Así va la tabla de <strong>{qimelaName}</strong> con datos simulados
            mientras llega la integración real.
          </p>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>Líder actual</span>
          <strong>{leader.playerName}</strong>
          <span>{leader.points} pts</span>
        </div>
      </div>

      {currentUser && (
        <div className={styles.callout}>
          <div>
            <p className={styles.calloutLabel}>Tu posición</p>
            <strong>
              {currentUser.rank}. {currentUser.playerName}
            </strong>
          </div>
          <span className={styles.calloutPoints}>{currentUser.points} pts</span>
        </div>
      )}

      <div className={styles.mobileList} aria-label="Listado de posiciones">
        {MOCK_POSITIONS.map((entry) => (
          <article
            key={entry.playerName}
            className={`${styles.mobileRow} ${entry.isCurrentUser ? styles.currentRow : ""}`}
          >
            <div className={styles.mobileTop}>
              <span className={`${styles.rank} ${getRankTone(entry.rank)}`}>
                {entry.rank}
              </span>
              <div className={styles.player}>
                <span className={styles.avatar} aria-hidden="true">
                  {entry.initials}
                </span>
                <span className={styles.playerText}>
                  <span className={styles.playerName}>{entry.playerName}</span>
                  {entry.isCurrentUser && (
                    <span className={styles.youBadge}>Tú</span>
                  )}
                </span>
              </div>
              <span className={styles.points}>{entry.points}</span>
            </div>
            <div className={styles.mobileStats}>
              <div>
                <span className={styles.mobileLabel}>Aciertos</span>
                <strong>{entry.hits}</strong>
              </div>
              <div>
                <span className={styles.mobileLabel}>Racha</span>
                <strong
                  className={
                    entry.streak.startsWith("-")
                      ? styles.streakDown
                      : styles.streakUp
                  }
                >
                  {entry.streak}
                </strong>
              </div>
              <div>
                <span className={styles.mobileLabel}>Puntos</span>
                <strong>{entry.points}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Pos.</th>
              <th scope="col">Participante</th>
              <th scope="col">Aciertos</th>
              <th scope="col">Racha</th>
              <th scope="col">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_POSITIONS.map((entry) => (
              <tr
                key={entry.playerName}
                className={entry.isCurrentUser ? styles.currentRow : undefined}
              >
                <td data-label="Posición">
                  <span className={`${styles.rank} ${getRankTone(entry.rank)}`}>
                    {entry.rank}
                  </span>
                </td>
                <td data-label="Participante">
                  <div className={styles.player}>
                    <span className={styles.avatar} aria-hidden="true">
                      {entry.initials}
                    </span>
                    <span className={styles.playerText}>
                      <span className={styles.playerName}>{entry.playerName}</span>
                      {entry.isCurrentUser && (
                        <span className={styles.youBadge}>Tú</span>
                      )}
                    </span>
                  </div>
                </td>
                <td data-label="Aciertos">{entry.hits}</td>
                <td data-label="Racha">
                  <span
                    className={
                      entry.streak.startsWith("-")
                        ? styles.streakDown
                        : styles.streakUp
                    }
                  >
                    {entry.streak}
                  </span>
                </td>
                <td data-label="Puntos">
                  <span className={styles.points}>{entry.points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
