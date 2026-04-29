"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { qimelasApi, inviteApi } from "@/lib/apiClient";
import { useAuthContext } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import type { QimelaDetail } from "@/types/qimela";
import SubscribersList from "@/components/qimela/SubscribersList/SubscribersList";
import styles from "./page.module.scss";

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Próxima",
  ACTIVE: "En curso",
  COMPLETED: "Completada",
};

export default function QimelaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [qimela, setQimela] = useState<QimelaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shareLoading, setShareLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const [editName, setEditName] = useState("");
  const [editStartPhaseId, setEditStartPhaseId] = useState<string | null>(null);
  const [editEndPhaseId, setEditEndPhaseId] = useState<string | null>(null);
  const [editRuleValues, setEditRuleValues] = useState<
    Record<string, number | "">
  >({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"subscribers" | "settings">(
    "settings",
  );

  useEffect(() => {
    qimelasApi
      .getById(id)
      .then((res) => {
        setQimela(res.data);
        setEditName(res.data.name);
        setEditStartPhaseId(res.data.startPhaseId);
        setEditEndPhaseId(res.data.endPhaseId);
        const ruleValues: Record<string, number | ""> = {};
        for (const rule of res.data.rules) {
          ruleValues[rule.ruleId] = rule.points;
        }
        setEditRuleValues(ruleValues);
      })
      .catch(() => setError("No se pudo cargar la qimela."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>Cargando...</p>
      </main>
    );
  }

  if (error || !qimela) {
    return (
      <main className={styles.page}>
        <p className={styles.error}>{error ?? "qimela no encontrada."}</p>
      </main>
    );
  }

  const isCreator = user?.id === qimela.creatorId;
  const isUpcoming = qimela.status === "UPCOMING";
  const isActive = qimela.status === "ACTIVE";
  const isCompleted = qimela.status === "COMPLETED";

  // Determine what has changed
  const nameChanged = editName !== qimela.name;
  const startPhaseChanged = editStartPhaseId !== qimela.startPhaseId;
  const endPhaseChanged = editEndPhaseId !== qimela.endPhaseId;
  const rulesChanged = qimela.rules.some(
    (r) => editRuleValues[r.ruleId] !== r.points,
  );
  const hasChanged =
    nameChanged || startPhaseChanged || endPhaseChanged || rulesChanged;

  // Phase helpers
  const sortedPhases = [...(qimela.phases ?? [])].sort(
    (a, b) => a.order - b.order,
  );
  const selectedStartPhase = sortedPhases.find(
    (p) => p.id === editStartPhaseId,
  );
  const endPhaseOptions = editStartPhaseId
    ? sortedPhases.filter((p) => {
        return !selectedStartPhase || p.order >= selectedStartPhase.order;
      })
    : [];

  function handleStartPhaseChange(phaseId: string) {
    const val = phaseId === "" ? null : phaseId;
    setEditStartPhaseId(val);
    // Reset end phase if it's now invalid
    if (val && editEndPhaseId) {
      const newStartPhase = sortedPhases.find((p) => p.id === val);
      const currentEndPhase = sortedPhases.find((p) => p.id === editEndPhaseId);
      if (
        newStartPhase &&
        currentEndPhase &&
        currentEndPhase.order < newStartPhase.order
      ) {
        setEditEndPhaseId(null);
      }
    }
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      const res = await inviteApi.generate(id);
      const url = `${window.location.origin}/invite/${res.data.token}`;
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado al portapapeles.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setShareLoading(false);
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      await inviteApi.revoke(id);
      toast("Enlace revocado correctamente.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setRevoking(false);
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      await qimelasApi.subscribe(id);
      setQimela((prev) => (prev ? { ...prev, isSubscribed: true } : prev));
      await queryClient.invalidateQueries({ queryKey: ["qimelas"] });
      toast("Te has suscrito a la qimela.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    } finally {
      setSubscribing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!qimela || !hasChanged || isCompleted) return;

    setSaving(true);
    setSaveError(null);

    try {
      const body: Record<string, unknown> = {};

      if (isUpcoming) {
        if (nameChanged) body.name = editName;
        if (startPhaseChanged) body.initialPhaseId = editStartPhaseId;
        if (endPhaseChanged) body.finalPhaseId = editEndPhaseId;
        if (rulesChanged) {
          body.rules = qimela.rules.map((r) => ({
            ruleId: r.ruleId,
            points: editRuleValues[r.ruleId] as number,
          }));
        }
      } else if (isActive) {
        if (endPhaseChanged) body.finalPhaseId = editEndPhaseId;
      }

      const res = await qimelasApi.update(id, body);
      setQimela((prev) =>
        prev
          ? {
              ...prev,
              name: res.data.name,
              status: res.data.status,
              startPhaseId: res.data.startPhaseId,
              endPhaseId: res.data.endPhaseId,
              ...(res.data.rules
                ? {
                    rules: prev.rules.map((r) => {
                      const updated = res.data.rules!.find(
                        (ur) => ur.ruleId === r.ruleId,
                      );
                      return updated ? { ...r, points: updated.points } : r;
                    }),
                  }
                : {}),
            }
          : prev,
      );
      setEditName(res.data.name);
      setEditStartPhaseId(res.data.startPhaseId);
      setEditEndPhaseId(res.data.endPhaseId);
      await queryClient.invalidateQueries({ queryKey: ["qimelas"] });
      toast("Cambios guardados correctamente.", "success");
    } catch {
      setSaveError("No se pudieron guardar los cambios. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{qimela.name}</h1>
        <span
          className={`${styles.statusBadge} ${styles[`statusBadge--${qimela.status.toLowerCase()}`]}`}
        >
          {STATUS_LABELS[qimela.status] ?? qimela.status}
        </span>
      </div>

      {isCreator && isUpcoming && !qimela.isSubscribed && (
        <div className={styles.subscribeWrapper}>
          <button
            type="button"
            className={styles.subscribeBtn}
            onClick={handleSubscribe}
            disabled={subscribing}
          >
            {subscribing ? "Suscribiendo..." : "Suscribirme"}
          </button>
        </div>
      )}

      {isCreator && (
        <div className={styles.tabContainer}>
          <div className={styles.tabBar} role="tablist">
            <button
              role="tab"
              type="button"
              aria-selected={activeTab === "settings"}
              className={`${styles.tab} ${activeTab === "settings" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              qimela
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={activeTab === "subscribers"}
              className={`${styles.tab} ${activeTab === "subscribers" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("subscribers")}
            >
              Participantes
            </button>
          </div>

          {activeTab === "subscribers" && (
            <SubscribersList qimelaId={id} isCreator={isCreator} />
          )}

          {activeTab === "settings" && (
            <>
              <section className={styles.shareSection}>
                <h2 className={styles.editHeading}>Enlace de invitación</h2>
                <p className={styles.shareDescription}>
                  Comparte este enlace para que otros usuarios puedan
                  suscribirse a tu qimela.
                </p>
                <div className={styles.shareActions}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleShare}
                    disabled={shareLoading}
                  >
                    {shareLoading ? "Generando..." : "Copiar enlace"}
                  </button>
                  <button
                    type="button"
                    className={styles.revokeBtn}
                    onClick={handleRevoke}
                    disabled={revoking}
                  >
                    {revoking ? "Revocando..." : "Revocar enlace"}
                  </button>
                </div>
              </section>

              {!isCompleted && (
                <section className={styles.editSection}>
                  <h2 className={styles.editHeading}>Editar qimela</h2>
                  <form onSubmit={handleSave} noValidate>
                    <div className={styles.fields}>
                      <div className={styles.field}>
                        <label htmlFor="edit-name" className={styles.label}>
                          Nombre
                        </label>
                        <input
                          id="edit-name"
                          type="text"
                          className={styles.input}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={50}
                          disabled={isActive}
                        />
                      </div>

                      {sortedPhases.length > 0 && (
                        <div className={styles.field}>
                          <label
                            htmlFor="edit-start-phase"
                            className={styles.label}
                          >
                            Fase inicial
                          </label>
                          <select
                            id="edit-start-phase"
                            className={styles.select}
                            value={editStartPhaseId ?? ""}
                            onChange={(e) =>
                              handleStartPhaseChange(e.target.value)
                            }
                            disabled={isActive}
                          >
                            <option value="">Selecciona la fase inicial</option>
                            {sortedPhases.map((phase) => (
                              <option key={phase.id} value={phase.id}>
                                {phase.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {sortedPhases.length > 0 && (
                        <div className={styles.field}>
                          <label
                            htmlFor="edit-end-phase"
                            className={styles.label}
                          >
                            Fase final
                          </label>
                          <select
                            id="edit-end-phase"
                            className={styles.select}
                            value={editEndPhaseId ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditEndPhaseId(val === "" ? null : val);
                            }}
                            disabled={!editStartPhaseId}
                          >
                            <option value="">Selecciona la fase final</option>
                            {endPhaseOptions.map((phase) => (
                              <option key={phase.id} value={phase.id}>
                                {phase.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {qimela.rules.length > 0 && (
                      <div className={styles.rulesSection}>
                        <p className={styles.rulesHeading}>Puntos por regla</p>
                        <div className={styles.rulesGrid}>
                          {qimela.rules.map((rule) => (
                            <div key={rule.ruleId} className={styles.field}>
                              <label
                                htmlFor={`rule-${rule.ruleId}`}
                                className={styles.label}
                              >
                                {rule.question}
                              </label>
                              <span className={styles.ruleRange}>
                                min: {rule.minPoints}, max: {rule.maxPoints}
                              </span>
                              <input
                                id={`rule-${rule.ruleId}`}
                                type="number"
                                className={styles.input}
                                min={rule.minPoints}
                                max={rule.maxPoints}
                                value={editRuleValues[rule.ruleId] ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setEditRuleValues((prev) => ({
                                    ...prev,
                                    [rule.ruleId]:
                                      raw === "" ? "" : Number(raw),
                                  }));
                                }}
                                disabled={isActive}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {saveError && (
                      <p className={styles.saveError}>{saveError}</p>
                    )}

                    <button
                      type="submit"
                      className={styles.saveBtn}
                      disabled={!hasChanged || saving}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </form>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
