import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { qimela } from "@/types/qimela";
import ParticipantDashboard from "./ParticipantDashboard";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-2", name: "Froylan Vargas" },
  }),
}));

vi.mock("@/components/dashboard/TablePositions", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/dashboard/TablePositions")
  >("@/components/dashboard/TablePositions");

  return {
    ...actual,
    default: () => <div>Tabla posiciones</div>,
  };
});

vi.mock("@/components/qimela/UpcomingSessions/UpcomingSessions", () => ({
  default: ({ qimelaId }: { qimelaId: string }) => (
    <div>Sesiones {qimelaId}</div>
  ),
}));

vi.mock("@/components/qimela/OpenQuestionsCard/OpenQuestionsCard", () => ({
  default: ({ qimelaId }: { qimelaId: string }) => (
    <div>Preguntas {qimelaId}</div>
  ),
}));

const qimela: qimela = {
  id: "qimela-1",
  name: "familia-ligamx",
  sportId: "sport-1",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "user-1",
};

describe("ParticipantDashboard", () => {
  it("renders the mobile switch and changes the active tab state", () => {
    render(<ParticipantDashboard qimela={qimela} />);

    expect(
      screen.getByRole("heading", { name: "familia-ligamx" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("En curso")).not.toBeInTheDocument();

    const sessionsTab = screen.getByRole("tab", { name: "Partidos" });
    const positionsTab = screen.getByRole("tab", { name: "Posiciones" });

    expect(sessionsTab).toHaveAttribute("aria-selected", "false");
    expect(positionsTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(sessionsTab);

    expect(sessionsTab).toHaveAttribute("aria-selected", "true");
    expect(positionsTab).toHaveAttribute("aria-selected", "false");
  });

  it("opens and closes the qimela rules modal", () => {
    render(<ParticipantDashboard qimela={qimela} />);

    fireEvent.click(screen.getByRole("button", { name: "Reglas qimela" }));

    expect(
      screen.getByRole("heading", { name: "Reglas de la qimela" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Las suscripciones a la qimela/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar reglas" }));

    expect(
      screen.queryByRole("heading", { name: "Reglas de la qimela" }),
    ).not.toBeInTheDocument();
  });
});
