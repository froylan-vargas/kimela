"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useQimelaPhases } from "@/hooks/useQimelaPhases";
import PhaseFilter from "@/components/qimela/ResultsComparison/PhaseFilter";
import styles from "./TablePositions.module.scss";

const PAGE_SIZE = 6;

interface TablePositionsProps {
  qimelaId: string;
  currentUserId?: string;
}

function AvatarCell({ imageUrl, initials }: { imageUrl: string | null; initials: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={initials} className={styles.avatarImg} aria-hidden="true" />
    );
  }
  return <>{initials}</>;
}

function getRankTone(rank: number) {
  if (rank === 1) return styles.rankGold;
  if (rank === 2) return styles.rankSilver;
  if (rank === 3) return styles.rankBronze;
  return "";
}

export default function TablePositions({ qimelaId, currentUserId }: TablePositionsProps) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { data: phases } = useQimelaPhases(qimelaId);
  const { data, isLoading, isError } = useLeaderboard(qimelaId, currentUserId, selectedPhaseId ?? undefined);

  useEffect(() => {
    setPage(0);
  }, [selectedPhaseId]);

  return (
    <section className={styles.card} aria-labelledby="table-positions-title">
      <div className={styles.header}>
        <h2 className={styles.title} id="table-positions-title">
          Posiciones
        </h2>
        <Link
          className={styles.resultsLink}
          href={`/qimela/${qimelaId}/results`}
        >
          Resultados
        </Link>
      </div>

      {phases && phases.length > 0 && (
        <PhaseFilter
          phases={phases}
          selectedPhaseId={selectedPhaseId}
          onChange={setSelectedPhaseId}
          placeholder="Todo el evento"
        />
      )}

      {isLoading && <div className={styles.state}>Cargando posiciones...</div>}
      {isError && (
        <div className={styles.state}>
          No se pudieron cargar las posiciones.
        </div>
      )}

      {data && data.length === 0 && (
        <div className={styles.state}>Aún no hay posiciones registradas.</div>
      )}

      {data && data.length > 0 && (() => {
        const totalPages = Math.ceil(data.length / PAGE_SIZE);
        const visibleData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        const currentUserInPage = visibleData.some((e) => e.isCurrentUser);
        const currentUserEntry = !currentUserInPage ? data.find((e) => e.isCurrentUser) : null;

        return (
          <>
            <div className={styles.mobileList} aria-label="Listado de posiciones">
              {visibleData.map((entry) => (
                <article
                  key={entry.userId}
                  className={`${styles.mobileRow} ${entry.isCurrentUser ? styles.currentRow : ""}`}
                >
                  <span className={`${styles.rank} ${getRankTone(entry.rank)}`}>
                    {entry.rank}
                  </span>
                  <div className={styles.player}>
                    <span className={styles.avatar} aria-hidden="true">
                      <AvatarCell imageUrl={entry.imageUrl} initials={entry.initials} />
                    </span>
                    <span className={styles.playerText}>
                      <span className={styles.playerName}>{entry.userName}</span>
                      {entry.isCurrentUser && (
                        <span className={styles.youBadge}>Tú</span>
                      )}
                    </span>
                  </div>
                  <div className={styles.mobileSecondary}>
                    <span className={styles.mobileExactos}>{entry.exactResultsCount} exactos</span>
                    <span className={styles.points}>{entry.totalPoints}</span>
                  </div>
                </article>
              ))}
              {currentUserEntry && (
                <>
                  <div className={styles.pinnedSeparator} aria-hidden="true" />
                  <article className={`${styles.mobileRow} ${styles.currentRow}`}>
                    <span className={`${styles.rank} ${getRankTone(currentUserEntry.rank)}`}>
                      {currentUserEntry.rank}
                    </span>
                    <div className={styles.player}>
                      <span className={styles.avatar} aria-hidden="true">
                        <AvatarCell imageUrl={currentUserEntry.imageUrl} initials={currentUserEntry.initials} />
                      </span>
                      <span className={styles.playerText}>
                        <span className={styles.playerName}>{currentUserEntry.userName}</span>
                        <span className={styles.youBadge}>Tú</span>
                      </span>
                    </div>
                    <div className={styles.mobileSecondary}>
                      <span className={styles.mobileExactos}>{currentUserEntry.exactResultsCount} exactos</span>
                      <span className={styles.points}>{currentUserEntry.totalPoints}</span>
                    </div>
                  </article>
                </>
              )}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Pos.</th>
                    <th scope="col">Participante</th>
                    <th scope="col">Puntos</th>
                    <th scope="col">Aciertos</th>
                    <th scope="col">Exactos</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleData.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={entry.isCurrentUser ? styles.currentRow : undefined}
                    >
                      <td>
                        <span className={`${styles.rank} ${getRankTone(entry.rank)}`}>
                          {entry.rank}
                        </span>
                      </td>
                      <td>
                        <div className={styles.player}>
                          <span className={styles.avatar} aria-hidden="true">
                            <AvatarCell imageUrl={entry.imageUrl} initials={entry.initials} />
                          </span>
                          <span className={styles.playerText}>
                            <span className={styles.playerName}>{entry.userName}</span>
                            {entry.isCurrentUser && (
                              <span className={styles.youBadge}>Tú</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.points}>{entry.totalPoints}</span>
                      </td>
                      <td>{entry.correctPicksCount}</td>
                      <td>{entry.exactResultsCount}</td>
                    </tr>
                  ))}
                  {currentUserEntry && (
                    <>
                      <tr className={styles.pinnedSeparatorRow} aria-hidden="true">
                        <td colSpan={5} />
                      </tr>
                      <tr className={styles.currentRow}>
                        <td>
                          <span className={`${styles.rank} ${getRankTone(currentUserEntry.rank)}`}>
                            {currentUserEntry.rank}
                          </span>
                        </td>
                        <td>
                          <div className={styles.player}>
                            <span className={styles.avatar} aria-hidden="true">
                              <AvatarCell imageUrl={currentUserEntry.imageUrl} initials={currentUserEntry.initials} />
                            </span>
                            <span className={styles.playerText}>
                              <span className={styles.playerName}>{currentUserEntry.userName}</span>
                              <span className={styles.youBadge}>Tú</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.points}>{currentUserEntry.totalPoints}</span>
                        </td>
                        <td>{currentUserEntry.correctPicksCount}</td>
                        <td>{currentUserEntry.exactResultsCount}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination} aria-label="Paginación de posiciones">
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  aria-label="Página anterior"
                >
                  ‹
                </button>
                <span className={styles.pageInfo}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages - 1}
                  aria-label="Página siguiente"
                >
                  ›
                </button>
              </div>
            )}
          </>
        );
      })()}
    </section>
  );
}
