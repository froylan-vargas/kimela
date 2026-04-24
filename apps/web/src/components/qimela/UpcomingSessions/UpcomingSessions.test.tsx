import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UpcomingSessions from "./UpcomingSessions";

vi.mock("@/hooks/useUpcomingSessions", () => ({
  useUpcomingSessions: () => ({
    data: [
      {
        phaseId: "phase-1",
        phaseName: "Grupos - Partido 1",
        phaseOrder: 1,
        sessions: [
          {
            id: "session-1",
            name: "México vs Sudáfrica",
          },
        ],
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/components/qimela/SessionCard/SessionCard", () => ({
  default: ({
    showPhaseName,
  }: {
    showPhaseName?: boolean;
  }) => <div>Session card {String(showPhaseName)}</div>,
}));

describe("UpcomingSessions", () => {
  it("renders the compact dashboard copy", () => {
    render(<UpcomingSessions qimelaId="q1" />);

    expect(
      screen.getByRole("heading", { name: "Próximos partidos" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Tus pronósticos")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Guarda cada partido por separado antes del cierre de pronósticos.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Ver todos",
      }),
    ).toHaveAttribute("href", "/qimela/q1/sessions");
    expect(screen.queryByText("Fase 1")).not.toBeInTheDocument();
    expect(screen.getByText("Grupos - Partido 1")).toBeInTheDocument();
    expect(screen.getByText("Session card false")).toBeInTheDocument();
  });
});
