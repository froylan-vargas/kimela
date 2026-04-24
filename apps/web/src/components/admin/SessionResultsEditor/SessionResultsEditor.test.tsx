import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SessionResultsEditor from "./SessionResultsEditor";
import type { Session } from "@/types/session";

vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/apiClient", () => ({ adminApi: { saveSessionResults: vi.fn() } }));

const DEFAULT_PROPS = { eventId: "event-1", phaseId: "phase-1" };

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: "s1",
  name: "Match 1",
  scheduledAt: "2026-04-19T20:00:00.000Z",
  status: "SCHEDULED",
  home: { id: "c1", name: "Team A", imgUrl: null },
  away: { id: "c2", name: "Team B", imgUrl: null },
  score: { home: null, away: null },
  ...overrides,
});

describe("SessionResultsEditor", () => {
  it("renders loading skeletons when isLoading is true", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[]}
        isLoading={true}
        isError={false}
        isPhaseActive={false}
      />,
    );

    expect(screen.getByLabelText("Cargando resultados")).toBeInTheDocument();
  });

  it("renders error message when isError is true", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[]}
        isLoading={false}
        isError={true}
        isPhaseActive={false}
      />,
    );

    expect(screen.getByText(/Error al cargar los partidos/)).toBeInTheDocument();
  });

  it("renders empty state when sessions is empty", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[]}
        isLoading={false}
        isError={false}
        isPhaseActive={false}
      />,
    );

    expect(screen.getByText(/No hay partidos en esta fase/)).toBeInTheDocument();
  });

  it("renders score inputs for both contenders", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            home: { id: "c1", name: "Real Madrid", imgUrl: null },
            away: { id: "c2", name: "Barcelona", imgUrl: null },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={false}
      />,
    );

    expect(screen.getByLabelText("Resultado de Real Madrid")).toBeInTheDocument();
    expect(screen.getByLabelText("Resultado de Barcelona")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar resultados" })).toBeDisabled();
  });

  it("enables save when phase is active and both scores are valid", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            home: { id: "c1", name: "Real Madrid", imgUrl: null },
            away: { id: "c2", name: "Barcelona", imgUrl: null },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("Resultado de Real Madrid"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Resultado de Barcelona"), {
      target: { value: "1" },
    });

    expect(
      screen.getByRole("button", { name: "Guardar resultados" }),
    ).toBeEnabled();
  });

  it("keeps save disabled when phase is not active even with valid scores", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            home: { id: "c1", name: "Real Madrid", imgUrl: null },
            away: { id: "c2", name: "Barcelona", imgUrl: null },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Resultado de Real Madrid"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Resultado de Barcelona"), {
      target: { value: "1" },
    });

    expect(
      screen.getByRole("button", { name: "Guardar resultados" }),
    ).toBeDisabled();
  });

  it("keeps save disabled when a score is outside the valid range", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            home: { id: "c1", name: "Real Madrid", imgUrl: null },
            away: { id: "c2", name: "Barcelona", imgUrl: null },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={true}
      />,
    );

    fireEvent.change(screen.getByLabelText("Resultado de Real Madrid"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Resultado de Barcelona"), {
      target: { value: "1" },
    });

    expect(
      screen.getByRole("button", { name: "Guardar resultados" }),
    ).toBeDisabled();
  });

  it("ignores non-numeric and out-of-range input while typing", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            home: { id: "c1", name: "Real Madrid", imgUrl: null },
            away: { id: "c2", name: "Barcelona", imgUrl: null },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={true}
      />,
    );

    const homeInput = screen.getByLabelText("Resultado de Real Madrid");

    fireEvent.change(homeInput, { target: { value: "-" } });
    expect(homeInput).toHaveValue("");

    fireEvent.change(homeInput, { target: { value: "1e2" } });
    expect(homeInput).toHaveValue("");

    fireEvent.change(homeInput, { target: { value: "100" } });
    expect(homeInput).toHaveValue("");

    fireEvent.change(homeInput, { target: { value: "99" } });
    expect(homeInput).toHaveValue("99");
  });

  it("sorts sessions by scheduledAt ascending", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            id: "s1",
            scheduledAt: "2026-04-19T22:00:00.000Z",
            home: { id: "c1", name: "Team C", imgUrl: null },
            away: { id: "c2", name: "Team D", imgUrl: null },
          }),
          makeSession({
            id: "s2",
            scheduledAt: "2026-04-19T18:00:00.000Z",
            home: { id: "c3", name: "Team A", imgUrl: null },
            away: { id: "c4", name: "Team B", imgUrl: null },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={true}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Team A");
    expect(items[1]).toHaveTextContent("Team C");
  });

  it("shows the saved final score for completed sessions", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            status: "COMPLETED",
            home: { id: "c1", name: "América", imgUrl: null },
            away: { id: "c2", name: "Chivas", imgUrl: null },
            score: { home: "3", away: "2" },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={true}
      />,
    );

    expect(screen.getByText("Resultado final registrado")).toBeInTheDocument();
    expect(screen.getByLabelText("Resultado de América")).toHaveValue("3");
    expect(screen.getByLabelText("Resultado de Chivas")).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Completado" })).toBeDisabled();
  });

  it("does not render the session name in the results card header", () => {
    render(
      <SessionResultsEditor
        {...DEFAULT_PROPS}
        sessions={[
          makeSession({
            name: "AMÉRICA VS CHIVAS",
            home: { id: "c1", name: "América", imgUrl: null },
            away: { id: "c2", name: "Chivas", imgUrl: null },
          }),
        ]}
        isLoading={false}
        isError={false}
        isPhaseActive={true}
      />,
    );

    expect(screen.queryByText("AMÉRICA VS CHIVAS")).not.toBeInTheDocument();
  });
});
