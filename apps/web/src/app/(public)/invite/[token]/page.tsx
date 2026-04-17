"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { inviteApi, ApiError } from "@/lib/apiClient";
import { useAuthContext } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import styles from "./page.module.scss";

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Próxima",
  ACTIVE: "En curso",
  COMPLETED: "Completada",
};

type InviteInfo = {
  qimelaId: string;
  name: string;
  status: string;
  sport: { id: string; name: string };
  creator: { name: string };
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthContext();
  const { toast } = useToast();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    inviteApi
      .getByToken(token)
      .then((res) => setInvite(res.data))
      .catch((err) => {
        console.error('[InvitePage] Failed to load', err);
        if (err instanceof ApiError && err.status === 410) {
          setError("Este enlace de invitación ha sido revocado.");
        } else {
          setError("Enlace de invitación no válido.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubscribe() {
    if (!user) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }
    setSubscribing(true);
    try {
      await inviteApi.subscribe(token);
      toast("Te suscribiste correctamente.", "success");
      router.push(`/qimela/${invite!.qimelaId}`);
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setSubscribing(false);
    }
  }

  if (loading || authLoading) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>Cargando...</p>
      </main>
    );
  }

  if (error || !invite) {
    return (
      <main className={styles.page}>
        <div className={styles.errorCard}>
          <p className={styles.errorText}>{error ?? "Enlace no encontrado."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.sport}>{invite.sport.name}</p>
          <span
            className={`${styles.statusBadge} ${styles[`statusBadge--${invite.status.toLowerCase()}`]}`}
          >
            {STATUS_LABELS[invite.status] ?? invite.status}
          </span>
        </div>

        <h1 className={styles.title}>{invite.name}</h1>

        <p className={styles.creator}>
          Creada por <strong>{invite.creator.name}</strong>
        </p>

        <p className={styles.description}>
          Te han invitado a unirte a esta quiniela. Suscríbete para participar.
        </p>

        <button
          className={styles.subscribeBtn}
          onClick={handleSubscribe}
          type="button"
          disabled={subscribing}
        >
          {subscribing ? "Suscribiendo..." : user ? "Suscribirse" : "Inicia sesión para suscribirte"}
        </button>
      </div>
    </main>
  );
}
