"use client";

import { useEffect, useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Sport } from "@/types/sport";
import type { QimelaEvent, Rule, CreateQimelaBody, CoveredStages } from "@/types/qimela";
import { qimelasApi } from "@/lib/apiClient";
import styles from "./CreateQimelaForm.module.scss";

const COVERED_STAGES_LABELS: Record<CoveredStages, string> = {
  REGULAR_SEASON: "Temporada regular",
  PLAYOFFS: "Playoffs",
  FULL: "Temporada completa (regular + playoffs)",
};

const EVENT_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "(Próximo)",
  ACTIVE: "(En curso)",
};

interface FormState {
  name: string;
  sport: Sport | null;
  event: QimelaEvent | null;
  coveredStages: CoveredStages | null;
  ruleValues: Record<string, number | "">;
}

type FormAction =
  | { type: "SET_NAME"; value: string }
  | { type: "SET_SPORT"; sport: Sport | null }
  | { type: "SET_EVENT"; event: QimelaEvent | null }
  | { type: "SET_COVERED_STAGES"; coveredStages: CoveredStages | null }
  | { type: "SET_RULE"; ruleId: string; value: number | "" }
  | { type: "INIT_RULES"; rules: Rule[] };

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.value };
    case "SET_SPORT":
      return { ...state, sport: action.sport, event: null, coveredStages: null, ruleValues: {} };
    case "SET_EVENT":
      return { ...state, event: action.event, coveredStages: null };
    case "SET_COVERED_STAGES":
      return { ...state, coveredStages: action.coveredStages };
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
  coveredStages: null,
  ruleValues: {},
};

export default function CreateQimelaForm() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [events, setEvents] = useState<QimelaEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [allRules, setAllRules] = useState<Rule[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    if (!state.sport) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    qimelasApi
      .getEvents(state.sport.id)
      .then((res) => setEvents(res.data))
      .finally(() => setEventsLoading(false));
  }, [state.sport?.id]);

  const filteredRules = state.sport
    ? allRules.filter((r) => r.sessionFormat === state.sport!.sessionFormat)
    : [];

  function handleSportChange(sportId: string) {
    const sport = sports.find((s) => s.id === sportId) ?? null;
    dispatch({ type: "SET_SPORT", sport });
    if (sport) {
      const rules = allRules.filter((r) => r.sessionFormat === sport.sessionFormat);
      dispatch({ type: "INIT_RULES", rules });
    }
  }

  function validate(): string | null {
    const trimmedName = state.name.trim();
    if (trimmedName.length < 8) return "El nombre debe tener al menos 8 caracteres.";
    if (trimmedName.length > 40) return "El nombre no puede superar los 40 caracteres.";
    if (!state.sport) return "Selecciona un deporte.";
    if (!state.event) return "Selecciona un evento.";
    if (!state.coveredStages) return "Selecciona las etapas a cubrir.";
    for (const rule of filteredRules) {
      const val = state.ruleValues[rule.id];
      if (val === "" || val === undefined) return "Ingresa un valor para cada regla.";
      if ((val as number) < rule.minPoints || (val as number) > rule.maxPoints) {
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
          coveredStages: state.coveredStages!,
          rules: filteredRules.map((r) => ({
            ruleId: r.id,
            points: state.ruleValues[r.id] as number,
          })),
        };
        const res = await qimelasApi.create(body);
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
            Nombre
          </label>
          <input
            id="qimela-name"
            type="text"
            className={styles.input}
            value={state.name}
            onChange={(e) => dispatch({ type: "SET_NAME", value: e.target.value })}
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
                {ev.leagueName} — {ev.name} {EVENT_STATUS_LABELS[ev.status] ?? ""}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="qimela-covered-stages" className={styles.label}>
            Etapas a cubrir
          </label>
          <select
            id="qimela-covered-stages"
            className={styles.select}
            value={state.coveredStages ?? ""}
            onChange={(e) => {
              const val = e.target.value as CoveredStages | "";
              dispatch({ type: "SET_COVERED_STAGES", coveredStages: val === "" ? null : val });
            }}
            disabled={isPending || !state.event}
          >
            <option value="">Selecciona las etapas a cubrir</option>
            {state.event && state.event.availableCoveredStages.length === 0 ? (
              <option value="" disabled>
                No hay etapas disponibles
              </option>
            ) : (
              (state.event?.availableCoveredStages ?? []).map((stage) => (
                <option key={stage} value={stage}>
                  {COVERED_STAGES_LABELS[stage]}
                </option>
              ))
            )}
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
                <span className={styles.ruleRange}>min: {rule.minPoints}, max: {rule.maxPoints}</span>
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
