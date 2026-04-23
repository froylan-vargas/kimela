import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SessionCard from "./SessionCard";
import type { SessionPrediction } from "@/types/prediction";

const mockToast = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useSavePrediction", () => ({
  useSavePrediction: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

describe("SessionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves home and away score picks for a session", async () => {
    mockMutateAsync.mockResolvedValue({
      data: { sessionId: "s1", picks: [] },
    });

    render(
      <SessionCard
        qimelaId="q1"
        session={{
          id: "s1",
          name: "Atlas vs América",
          scheduledAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          status: "SCHEDULED",
          phaseId: "p1",
          phaseName: "Jornada 1",
          score: { home: null, away: null },
          home: { id: "h1", name: "Atlas", imgUrl: null },
          away: { id: "a1", name: "América", imgUrl: null },
          hasUserPicks: false,
          picks: [
            {
              pickCategoryId: "home-pick",
              name: "score_home",
              label: "Goles local",
              valueType: "SCALAR",
              value: null,
              pickedContenderId: null,
            },
            {
              pickCategoryId: "away-pick",
              name: "score_away",
              label: "Goles visitante",
              valueType: "SCALAR",
              value: null,
              pickedContenderId: null,
            },
          ],
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Marcador Atlas"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Marcador América"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        sessionId: "s1",
        picks: [
          { pickCategoryId: "home-pick", value: "2" },
          { pickCategoryId: "away-pick", value: "1" },
        ],
      });
    });
    expect(mockToast).toHaveBeenCalledWith(
      "Pronóstico guardado correctamente.",
      "success",
    );
  });

  it("shows editable saved state and updates existing predictions", async () => {
    mockMutateAsync.mockResolvedValue({
      data: { sessionId: "s2", picks: [] },
    });

    render(
      <SessionCard
        qimelaId="q1"
        session={{
          id: "s2",
          name: "Tigres vs Monterrey",
          scheduledAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          status: "SCHEDULED",
          phaseId: "p1",
          phaseName: "Jornada 2",
          score: { home: null, away: null },
          home: { id: "h2", name: "Tigres", imgUrl: null },
          away: { id: "a2", name: "Monterrey", imgUrl: null },
          hasUserPicks: true,
          picks: [
            {
              pickCategoryId: "home-pick",
              name: "score_home",
              label: "Goles local",
              valueType: "SCALAR",
              value: "1",
              pickedContenderId: null,
            },
            {
              pickCategoryId: "away-pick",
              name: "score_away",
              label: "Goles visitante",
              valueType: "SCALAR",
              value: "0",
              pickedContenderId: null,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText("Guardado, aún puedes editar"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Marcador Tigres"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Marcador Monterrey"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        sessionId: "s2",
        picks: [
          { pickCategoryId: "home-pick", value: "2" },
          { pickCategoryId: "away-pick", value: "2" },
        ],
      });
    });
    expect(mockToast).toHaveBeenCalledWith(
      "Pronóstico actualizado correctamente.",
      "success",
    );
  });

  it("syncs inputs when session picks update from the server", () => {
    const scheduledAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const initialSession: SessionPrediction = {
      id: "s3",
      name: "América vs Chivas",
      scheduledAt,
      status: "SCHEDULED",
      phaseId: "p1",
      phaseName: "Jornada 14",
      score: { home: null, away: null },
      home: { id: "h3", name: "América", imgUrl: null },
      away: { id: "a3", name: "Chivas", imgUrl: null },
      hasUserPicks: false,
      picks: [
        {
          pickCategoryId: "home-pick",
          name: "score_home",
          label: "Goles local",
          valueType: "SCALAR",
          value: null,
          pickedContenderId: null,
        },
        {
          pickCategoryId: "away-pick",
          name: "score_away",
          label: "Goles visitante",
          valueType: "SCALAR",
          value: null,
          pickedContenderId: null,
        },
      ],
    };

    const { rerender } = render(
      <SessionCard qimelaId="q1" session={initialSession} />,
    );

    expect(screen.getByLabelText("Marcador América")).toHaveValue("");
    expect(screen.getByLabelText("Marcador Chivas")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    const refreshedSession: SessionPrediction = {
      ...initialSession,
      hasUserPicks: true,
      picks: [
        { ...initialSession.picks[0], value: "2" },
        { ...initialSession.picks[1], value: "1" },
      ],
    };

    rerender(<SessionCard qimelaId="q1" session={refreshedSession} />);

    expect(screen.getByLabelText("Marcador América")).toHaveValue("2");
    expect(screen.getByLabelText("Marcador Chivas")).toHaveValue("1");
    expect(
      screen.getByRole("button", { name: "Actualizar" }),
    ).toBeEnabled();
  });
});
