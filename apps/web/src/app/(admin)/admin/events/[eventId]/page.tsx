"use client";

import { use, useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { usePhases } from "@/hooks/usePhases";
import { useSessions } from "@/hooks/useSessions";
import { adminApi } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";
import { toUserMessage } from "@/lib/errors";
import PhaseList from "@/components/admin/PhaseList/PhaseList";
import PhaseForm from "@/components/admin/PhaseForm/PhaseForm";
import SessionResultsEditor from "@/components/admin/SessionResultsEditor/SessionResultsEditor";
import SessionUpload from "@/components/admin/SessionUpload/SessionUpload";
import type { Phase } from "@/types/phase";
import styles from "./page.module.scss";

type Tab = "csv" | "resultados";

interface EventManagementPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ name?: string }>;
}

export default function EventManagementPage({
  params,
  searchParams,
}: EventManagementPageProps) {
  const { eventId } = use(params);
  const { name: eventName } = use(searchParams);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: phases, isLoading: phasesLoading, isError: phasesError } = usePhases(eventId);

  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("resultados");
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [localPhases, setLocalPhases] = useState<Phase[] | null>(null);
  const [phasePendingDelete, setPhasePendingDelete] = useState<Phase | null>(null);
  const [isUploading, startUploadTransition] = useTransition();

  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
  } = useSessions(eventId, selectedPhase?.id ?? null);

  function handlePhaseCreated(phase: Phase) {
    queryClient.setQueryData<Phase[]>(["admin", "phases", eventId], (prev) => {
      const list = prev ?? [];
      return [...list, phase];
    });
    setLocalPhases(null);
    setShowPhaseForm(false);
    setSelectedPhase(phase);
    setActiveTab("resultados");
  }

  function handlePhaseSelect(phase: Phase) {
    setSelectedPhase(phase);
    setActiveTab("resultados");
  }

  async function handleReorder(reordered: Phase[]) {
    setLocalPhases(reordered);
    try {
      await adminApi.reorderPhases(
        eventId,
        reordered.map((p) => ({ id: p.id, order: p.order })),
      );
      queryClient.setQueryData<Phase[]>(["admin", "phases", eventId], reordered);
    } catch (err) {
      console.error('[EventManagementPage] Failed to reorder phases', err);
      // rollback
    } finally {
      setLocalPhases(null);
    }
  }

  async function handleActivatePhase(phaseId: string) {
    try {
      const res = await adminApi.activatePhase(eventId, phaseId);
      const updated = res.data;
      queryClient.setQueryData<Phase[]>(["admin", "phases", eventId], (prev) =>
        (prev ?? []).map((p) => (p.id === phaseId ? { ...p, status: updated.status } : p)),
      );
      toast("Fase actualizada correctamente.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    }
  }

  async function handleCompletePhase(phaseId: string) {
    try {
      const res = await adminApi.completePhase(eventId, phaseId);
      const updated = res.data;
      queryClient.setQueryData<Phase[]>(["admin", "phases", eventId], (prev) =>
        (prev ?? []).map((p) => (p.id === phaseId ? { ...p, status: updated.status } : p)),
      );
      toast("Fase actualizada correctamente.", "success");
    } catch (err) {
      toast(toUserMessage(err), "error");
    }
  }

  function canCompletePhase(phase: Phase): boolean {
    if (phase.id !== selectedPhase?.id) return true;
    if (!sessions) return true;
    return !sessions.some((s) => s.status === "SCHEDULED" || s.status === "LIVE");
  }

  function canActivatePhase(phase: Phase): boolean {
    return !displayedPhases.some((item) => item.id !== phase.id && item.status === "ACTIVE");
  }

  function handleDeletePhase(phaseId: string) {
    const phase = displayedPhases.find((item) => item.id === phaseId);
    if (!phase) return;
    setPhasePendingDelete(phase);
  }

  async function confirmDeletePhase() {
    if (!phasePendingDelete) return;

    const phaseId = phasePendingDelete.id;
    const prev = queryClient.getQueryData<Phase[]>(["admin", "phases", eventId]) ?? [];
    const updated = prev.filter((p) => p.id !== phaseId);
    queryClient.setQueryData<Phase[]>(["admin", "phases", eventId], updated);
    setLocalPhases(null);
    if (selectedPhase?.id === phaseId) setSelectedPhase(null);
    setPhasePendingDelete(null);

    try {
      await adminApi.deletePhase(eventId, phaseId);
      toast("Fase eliminada correctamente.", "success");
    } catch (err) {
      console.error('[EventManagementPage] Failed to delete phase', err);
      queryClient.setQueryData<Phase[]>(["admin", "phases", eventId], prev);
      toast(toUserMessage(err), "error");
    }
  }

  async function handleUpload(file: File) {
    if (!selectedPhase) return;

    await new Promise<void>((resolve, reject) => {
      startUploadTransition(async () => {
        try {
          const res = await adminApi.uploadSessions(eventId, selectedPhase.id, file);
          await queryClient.invalidateQueries({
            queryKey: ["admin", "sessions", eventId, selectedPhase.id],
          });
          setActiveTab("resultados");
          toast(`${res.data.length} sesiones cargadas correctamente.`, "success");
          resolve();
        } catch (err) {
          toast(toUserMessage(err), "error");
          reject(err);
        }
      });
    });
  }

  const displayedPhases = localPhases ?? phases ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/events" className={styles.backLink}>
          &larr; Volver a eventos
        </Link>
        <h1 className={styles.title}>
          {eventName ? decodeURIComponent(eventName) : "Administrar evento"}
        </h1>
        <p className={styles.subtitle}>Gestiona las fases y partidos de este evento.</p>
      </div>

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Fases</h2>
          </div>

          {phasesLoading && (
            <div className={styles.skeletonList} aria-label="Cargando fases">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.skeletonItem} />
              ))}
            </div>
          )}

          {phasesError && (
            <p className={styles.error}>
              Error al cargar las fases. Intenta de nuevo.
            </p>
          )}

          {!phasesLoading && !phasesError && (
            <PhaseList
              phases={displayedPhases}
              selectedPhaseId={selectedPhase?.id}
              onSelect={handlePhaseSelect}
              onReorder={handleReorder}
              onDelete={handleDeletePhase}
              onActivate={handleActivatePhase}
              onComplete={handleCompletePhase}
              canActivatePhase={canActivatePhase}
              canCompletePhase={canCompletePhase}
            />
          )}

          <div className={styles.sidebarFooter}>
            {showPhaseForm ? (
              <div className={styles.inlineForm}>
                <PhaseForm eventId={eventId} onCreated={handlePhaseCreated} />
                <button
                  type="button"
                  className={styles.cancelFormBtn}
                  onClick={() => setShowPhaseForm(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.newPhaseBtn}
                onClick={() => setShowPhaseForm(true)}
              >
                + Nueva fase
              </button>
            )}
          </div>
        </aside>

        {/* ── Main panel ── */}
        <section className={styles.panel}>
          {!selectedPhase ? (
            <div className={styles.emptyPanel}>
              <p className={styles.emptyPanelText}>
                Selecciona una fase para ver sus partidos.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>{selectedPhase.name}</h2>

                <div className={styles.tabs} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "csv"}
                    className={`${styles.tab} ${activeTab === "csv" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("csv")}
                  >
                    Cargar CSV
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "resultados"}
                    className={`${styles.tab} ${activeTab === "resultados" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("resultados")}
                  >
                    Resultados
                  </button>
                </div>
              </div>

              <div className={styles.panelBody}>
                {activeTab === "csv" && (
                  <SessionUpload
                    onUpload={handleUpload}
                    isUploading={isUploading}
                  />
                )}

                {activeTab === "resultados" && (
                  <SessionResultsEditor
                    eventId={eventId}
                    phaseId={selectedPhase.id}
                    sessions={sessions ?? []}
                    isLoading={sessionsLoading}
                    isError={sessionsError}
                    isPhaseActive={selectedPhase.status === "ACTIVE"}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {phasePendingDelete && (
        <div
          className={styles.confirmOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPhasePendingDelete(null);
            }
          }}
        >
          <section
            className={styles.confirmDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-phase-title"
          >
            <h2 id="delete-phase-title" className={styles.confirmTitle}>
              Eliminar fase
            </h2>
            <p className={styles.confirmText}>
              ¿Seguro que quieres eliminar la fase <strong>{phasePendingDelete.name}</strong>?
            </p>
            <p className={styles.confirmWarning}>
              También se eliminarán sus partidos, resultados y pronósticos asociados.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={() => setPhasePendingDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmDelete}
                onClick={confirmDeletePhase}
              >
                Eliminar fase
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
