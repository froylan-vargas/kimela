"use client";

import { useState, useEffect, useCallback } from "react";
import { qimelasApi } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import styles from "./SubscribersList.module.scss";

interface Subscriber {
  userId: string;
  name: string;
  email: string;
}

interface Props {
  qimelaId: string;
}

const PAGE_SIZE = 10;

export default function SubscribersList({ qimelaId }: Props) {
  const { toast } = useToast();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
      setSubscribers(res.data.subscribers);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <section className={styles.section}>
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
