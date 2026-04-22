import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SessionCard from "./SessionCard";

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
});
