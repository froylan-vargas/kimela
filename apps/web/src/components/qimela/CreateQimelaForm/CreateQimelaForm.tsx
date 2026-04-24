"use client";

import { useEffect, useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Sport } from "@/types/sport";
import type { QimelaEvent, Rule, CreateQimelaBody } from "@/types/qimela";
import { qimelasApi } from "@/lib/apiClient";
import styles from "./CreateQimelaForm.module.scss";

const EVENT_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "(Próximo)",
  ACTIVE: "(En curso)",
};

interface FormState {
  name: string;
  sport: Sport | null;
  event: QimelaEvent | null;
  initialPhaseId: string | null;
  finalPhaseId: string | null;
  ruleValues: Record<string, number | "">;
}

type FormAction =
  | { type: "SET_NAME"; value: string }
  | { type: "SET_SPORT"; sport: Sport | null }
  | { type: "SET_EVENT"; event: QimelaEvent | null }
  | { type: "SET_INITIAL_PHASE"; phaseId: string | null }
  | { type: "SET_FINAL_PHASE"; phaseId: string | null }
  | { type: "SET_RULE"; ruleId: string; value: number | "" }
  | { type: "INIT_RULES"; rules: Rule[] };

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.value };
    case "SET_SPORT":
      return {
        ...state,
        sport: action.sport,
        event: null,
        initialPhaseId: null,
        finalPhaseId: null,
        ruleValues: {},
      };
    case "SET_EVENT":
      return {
        ...state,
        event: action.event,
        initialPhaseId: null,
        finalPhaseId: null,
      };
    case "SET_INITIAL_PHASE": {
      let newFinalPhaseId = state.finalPhaseId;
      if (action.phaseId && state.finalPhaseId) {
        const initialPhase = state.event?.phases.find(
          (p) => p.id === action.phaseId,
        );
        const finalPhase = state.event?.phases.find(
          (p) => p.id === state.finalPhaseId,
        );
        if (
          initialPhase &&
          finalPhase &&
          finalPhase.order < initialPhase.order
        ) {
          newFinalPhaseId = null;
        }
      }
      return {
        ...state,
        initialPhaseId: action.phaseId,
        finalPhaseId: newFinalPhaseId,
      };
    }
    case "SET_FINAL_PHASE":
      return { ...state, finalPhaseId: action.phaseId };
    case "SET_RULE":
      return {
        ...state,
        ruleValues: { ...state.ruleValues, [action.ruleId]: action.value },
      };
    case "INIT_RULES": {
      const ruleValues: Record<string, number | ""> = {};
      for (const r of action.rules) {
        ruleValues[r.id] = "";
      }
      return { ...state, ruleValues };
    }
    default:
      return state;
  }
}

const initialState: FormState = {
  name: "",
  sport: null,
  event: null,
  initialPhaseId: null,
  finalPhaseId: null,
  ruleValues: {},
};

export default function CreateQimelaForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(reducer, initialState);

  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [events, setEvents] = useState<QimelaEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [allRules, setAllRules] = useState<Rule[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sportId = state.sport?.id ?? null;

  useEffect(() => {
    setSportsLoading(true);
    Promise.all([qimelasApi.getSports(), qimelasApi.getRules()])
      .then(([sportsRes, rulesRes]) => {
        setSports(sportsRes.data);
        setAllRules(rulesRes.data);
      })
      .finally(() => setSportsLoading(false));
  }, []);

  useEffect(() => {
    if (!sportId) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    qimelasApi
      .getEvents(sportId)
      .then((res) => setEvents(res.data))
      .finally(() => setEventsLoading(false));
  }, [sportId]);

  const filteredRules = state.sport
    ? allRules.filter((r) => r.sessionFormat === state.sport!.sessionFormat)
    : [];

  function handleSportChange(sportId: string) {
    const sport = sports.find((s) => s.id === sportId) ?? null;
    dispatch({ type: "SET_SPORT", sport });
    if (sport) {
      const rules = allRules.filter(
        (r) => r.sessionFormat === sport.sessionFormat,
      );
      dispatch({ type: "INIT_RULES", rules });
    }
  }

  function validate(): string | null {
    const trimmedName = state.name.trim();
    if (trimmedName.length < 8)
      return "El nombre debe tener al menos 8 caracteres.";
    if (trimmedName.length > 40)
      return "El nombre no puede superar los 40 caracteres.";
    if (!state.sport) return "Selecciona un deporte.";
    if (!state.event) return "Selecciona un evento.";
    if (!state.initialPhaseId) return "Selecciona la fase inicial.";
    if (!state.finalPhaseId) return "Selecciona la fase final.";
    for (const rule of filteredRules) {
      const val = state.ruleValues[rule.id];
      if (val === "" || val === undefined)
        return "Ingresa un valor para cada regla.";
      if (
        (val as number) < rule.minPoints ||
        (val as number) > rule.maxPoints
      ) {
        return `Cada regla debe estar entre su mínimo y máximo permitido.`;
      }
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }

    startTransition(async () => {
      try {
        const body: CreateQimelaBody = {
          name: state.name.trim(),
          sportId: state.sport!.id,
          eventId: state.event!.id,
          leagueId: state.event!.leagueId,
          initialPhaseId: state.initialPhaseId!,
          finalPhaseId: state.finalPhaseId!,
          rules: filteredRules.map((r) => ({
            ruleId: r.id,
            points: state.ruleValues[r.id] as number,
          })),
        };
        const res = await qimelasApi.create(body);
        await queryClient.invalidateQueries({ queryKey: ["qimelas"] });
        router.push(`/qimela/${res.data.id}`);
      } catch {
        setSubmitError("Error al crear la qimela. Intenta de nuevo.");
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="qimela-name" className={styles.label}>
            Nombre de tu qimela
          </label>
          <input
            id="qimela-name"
            type="text"
            className={styles.input}
            value={state.name}
            onChange={(e) =>
              dispatch({ type: "SET_NAME", value: e.target.value })
            }
            placeholder="Nombre de tu qimela"
            disabled={isPending}
            aria-required="true"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="qimela-sport" className={styles.label}>
            Deporte
          </label>
          <select
            id="qimela-sport"
            className={styles.select}
            value={state.sport?.id ?? ""}
            onChange={(e) => handleSportChange(e.target.value)}
            disabled={isPending || sportsLoading}
          >
            <option value="">
              {sportsLoading ? "Cargando deportes..." : "Selecciona un deporte"}
            </option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="qimela-event" className={styles.label}>
            Evento
          </label>
          <select
            id="qimela-event"
            className={styles.select}
            value={state.event?.id ?? ""}
            onChange={(e) => {
              const ev = events.find((ev) => ev.id === e.target.value) ?? null;
              dispatch({ type: "SET_EVENT", event: ev });
            }}
            disabled={isPending || !state.sport || eventsLoading}
          >
            <option value="">
              {eventsLoading ? "Cargando eventos..." : "Selecciona un evento"}
            </option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.leagueName} — {ev.name}{" "}
                {EVENT_STATUS_LABELS[ev.status] ?? ""}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="qimela-initial-phase" className={styles.label}>
            Fase inicial
          </label>
          <select
            id="qimela-initial-phase"
            className={styles.select}
            value={state.initialPhaseId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              dispatch({
                type: "SET_INITIAL_PHASE",
                phaseId: val === "" ? null : val,
              });
            }}
            disabled={isPending || !state.event}
            aria-required="true"
          >
            <option value="">Selecciona la fase inicial</option>
            {(state.event?.phases ?? [])
              .sort((a, b) => a.order - b.order)
              .map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="qimela-final-phase" className={styles.label}>
            Fase final
          </label>
          <select
            id="qimela-final-phase"
            className={styles.select}
            value={state.finalPhaseId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              dispatch({
                type: "SET_FINAL_PHASE",
                phaseId: val === "" ? null : val,
              });
            }}
            disabled={isPending || !state.initialPhaseId}
            aria-required="true"
          >
            <option value="">Selecciona la fase final</option>
            {state.initialPhaseId
              ? (state.event?.phases ?? [])
                  .filter((phase) => {
                    const initialPhase = state.event?.phases.find(
                      (p) => p.id === state.initialPhaseId,
                    );
                    return !initialPhase || phase.order >= initialPhase.order;
                  })
                  .sort((a, b) => a.order - b.order)
                  .map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))
              : null}
          </select>
        </div>
      </div>

      {filteredRules.length > 0 && (
        <div className={styles.rulesSection}>
          <p className={styles.rulesHeading}>Puntos por regla</p>
          <div className={styles.rulesGrid}>
            {filteredRules.map((rule) => (
              <div key={rule.id} className={styles.field}>
                <label htmlFor={`rule-${rule.id}`} className={styles.label}>
                  {rule.question}
                </label>
                <span className={styles.ruleRange}>
                  min: {rule.minPoints}, max: {rule.maxPoints}
                </span>
                <input
                  id={`rule-${rule.id}`}
                  type="number"
                  className={styles.input}
                  min={rule.minPoints}
                  max={rule.maxPoints}
                  value={state.ruleValues[rule.id] ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    dispatch({
                      type: "SET_RULE",
                      ruleId: rule.id,
                      value: raw === "" ? "" : Number(raw),
                    });
                  }}
                  disabled={isPending}
                  aria-required="true"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {submitError && (
        <p className={styles.error} role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={isPending}>
        {isPending ? "Creando qimela..." : "Crear qimela"}
      </button>
    </form>
  );
}
