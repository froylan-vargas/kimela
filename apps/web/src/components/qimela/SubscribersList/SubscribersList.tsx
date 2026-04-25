"use client";

import { useState, useEffect, useCallback } from "react";
import { qimelasApi, QimelaLabel } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import styles from "./SubscribersList.module.scss";

const PRESET_COLORS = [
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#ec4899",
  "#14b8a6",
];

interface Subscriber {
  userId: string;
  name: string;
  email: string;
  labels: QimelaLabel[];
}

interface Props {
  qimelaId: string;
  isCreator?: boolean;
}

const PAGE_SIZE = 10;

export default function SubscribersList({ qimelaId, isCreator = false }: Props) {
  const { toast } = useToast();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [labels, setLabels] = useState<QimelaLabel[]>([]);
  const [showLabelPanel, setShowLabelPanel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [deletingLabelId, setDeletingLabelId] = useState<string | null>(null);
  const [openDropdownUserId, setOpenDropdownUserId] = useState<string | null>(null);
  const [togglingLabel, setTogglingLabel] = useState<{ userId: string; labelId: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qimelasApi.getSubscribers(qimelaId, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setSubscribers(
        res.data.subscribers.map((s) => ({ ...s, labels: s.labels ?? [] })),
      );
      setTotal(res.data.total);
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }, [qimelaId, page, debouncedSearch, toast]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const fetchLabels = useCallback(async () => {
    if (!isCreator) return;
    try {
      const res = await qimelasApi.getLabels(qimelaId);
      setLabels(res.data.labels);
    } catch {
      // silent — label panel just won't populate
    }
  }, [qimelaId, isCreator]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    try {
      await qimelasApi.removeSubscriber(qimelaId, userId);
      toast("Suscriptor eliminado.", "success");
      await fetchSubscribers();
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    setCreatingLabel(true);
    try {
      const res = await qimelasApi.createLabel(qimelaId, {
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setLabels((prev) => [...prev, res.data]);
      setNewLabelName("");
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setCreatingLabel(false);
    }
  }

  async function handleDeleteLabel(labelId: string) {
    setDeletingLabelId(labelId);
    try {
      await qimelasApi.deleteLabel(qimelaId, labelId);
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      setSubscribers((prev) =>
        prev.map((s) => ({ ...s, labels: s.labels.filter((l) => l.id !== labelId) })),
      );
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setDeletingLabelId(null);
    }
  }

  async function handleToggleLabel(userId: string, labelId: string, isAssigned: boolean) {
    setTogglingLabel({ userId, labelId });
    try {
      if (isAssigned) {
        await qimelasApi.removeLabel(qimelaId, userId, labelId);
        setSubscribers((prev) =>
          prev.map((s) =>
            s.userId === userId
              ? { ...s, labels: s.labels.filter((l) => l.id !== labelId) }
              : s,
          ),
        );
      } else {
        await qimelasApi.applyLabel(qimelaId, userId, labelId);
        const label = labels.find((l) => l.id === labelId);
        if (label) {
          setSubscribers((prev) =>
            prev.map((s) =>
              s.userId === userId ? { ...s, labels: [...s.labels, label] } : s,
            ),
          );
        }
      }
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setTogglingLabel(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <section className={styles.section}>
      {isCreator && (
        <div className={styles.labelSection}>
          <button
            type="button"
            className={styles.labelPanelToggle}
            onClick={() => setShowLabelPanel((v) => !v)}
          >
            Etiquetas ({labels.length}/3)
            <span className={styles.toggleChevron}>{showLabelPanel ? "▲" : "▼"}</span>
          </button>

          {showLabelPanel && (
            <div className={styles.labelPanel}>
              {labels.length === 0 ? (
                <p className={styles.emptyLabels}>Sin etiquetas. Crea hasta 3.</p>
              ) : (
                <div className={styles.existingLabels}>
                  {labels.map((l) => (
                    <span
                      key={l.id}
                      className={styles.manageLabelPill}
                      style={{ backgroundColor: `${l.color}1a`, color: l.color }}
                    >
                      {l.name}
                      <button
                        type="button"
                        className={styles.manageLabelDelete}
                        aria-label={`Eliminar etiqueta ${l.name}`}
                        disabled={deletingLabelId === l.id}
                        onClick={() => handleDeleteLabel(l.id)}
                        style={{ color: l.color }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {labels.length < 3 && (
                <form onSubmit={handleCreateLabel} className={styles.createLabelForm}>
                  <div className={styles.createLabelRow}>
                    <input
                      type="text"
                      className={styles.labelNameInput}
                      placeholder="Nombre de etiqueta"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      maxLength={30}
                    />
                    <button
                      type="submit"
                      className={styles.createBtn}
                      disabled={!newLabelName.trim() || creatingLabel}
                    >
                      {creatingLabel ? "..." : "Crear"}
                    </button>
                  </div>
                  <div className={styles.colorSwatches}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`${styles.swatch} ${newLabelColor === c ? styles.swatchSelected : ""}`}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                        onClick={() => setNewLabelColor(c)}
                      />
                    ))}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.searchWrapper}>
        <input
          type="search"
          className={styles.search}
          placeholder="Buscar por nombre o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando...</p>
      ) : subscribers.length === 0 ? (
        <p className={styles.empty}>
          {debouncedSearch ? "Sin resultados." : "Aún no hay participantes."}
        </p>
      ) : (
        <ul className={styles.list}>
          {subscribers.map((s) => (
            <li key={s.userId} className={styles.row}>
              <div className={styles.info}>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.email}>{s.email}</span>
              </div>

              {isCreator && (
                <div className={styles.labelArea}>
                  {s.labels.map((l) => (
                    <span
                      key={l.id}
                      className={styles.labelPill}
                      style={{ backgroundColor: `${l.color}1a`, color: l.color }}
                    >
                      {l.name}
                    </span>
                  ))}
                  {labels.length > 0 && (
                    <div className={styles.labelDropdownWrapper}>
                      <button
                        type="button"
                        className={styles.assignLabelBtn}
                        aria-label={`Etiquetar a ${s.name}`}
                        onClick={() =>
                          setOpenDropdownUserId(
                            openDropdownUserId === s.userId ? null : s.userId,
                          )
                        }
                      >
                        +
                      </button>
                      {openDropdownUserId === s.userId && (
                        <div className={styles.labelDropdown}>
                          {labels.map((label) => {
                            const isAssigned = s.labels.some((l) => l.id === label.id);
                            const isToggling =
                              togglingLabel?.userId === s.userId &&
                              togglingLabel?.labelId === label.id;
                            return (
                              <button
                                key={label.id}
                                type="button"
                                className={styles.dropdownItem}
                                disabled={isToggling}
                                onClick={() => handleToggleLabel(s.userId, label.id, isAssigned)}
                              >
                                <span
                                  className={styles.dropdownDot}
                                  style={{ backgroundColor: label.color }}
                                />
                                <span className={styles.dropdownLabel}>{label.name}</span>
                                {isAssigned && (
                                  <span className={styles.checkmark}>✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className={styles.removeBtn}
                aria-label={`Eliminar a ${s.name}`}
                disabled={removingId === s.userId}
                onClick={() => handleRemove(s.userId)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {openDropdownUserId && (
        <div
          className={styles.backdrop}
          onClick={() => setOpenDropdownUserId(null)}
        />
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <span className={styles.pageInfo}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}

      {total > 0 && (
        <p className={styles.totalCount}>
          {total} suscriptor{total !== 1 ? "es" : ""}
        </p>
      )}
    </section>
  );
}
