import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Qimela } from "@/types/qimela";
import ParticipantDashboard from "./ParticipantDashboard";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-2", name: "Froylan Vargas" },
  }),
}));

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    data: [
      {
        userId: "user-1",
        userName: "Ana Torres",
        initials: "AT",
        totalPoints: 124,
        correctPicksCount: 18,
        exactResultsCount: 5,
        rank: 2,
        isCurrentUser: false,
      },
      {
        userId: "user-2",
        userName: "Froylan Vargas",
        initials: "FV",
        totalPoints: 24,
        correctPicksCount: 10,
        exactResultsCount: 2,
        rank: 1,
        isCurrentUser: true,
      },
    ],
    isLoading: false,
    isError: false,
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

const qimela: Qimela = {
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
    expect(screen.getByText("Usuario")).toBeInTheDocument();
    expect(screen.getByText("Froylan Vargas")).toBeInTheDocument();
    expect(screen.getByText("Pos")).toBeInTheDocument();
    expect(screen.getByText("Puntos")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();

    const sessionsTab = screen.getByRole("tab", { name: "Partidos" });
    const positionsTab = screen.getByRole("tab", { name: "Posiciones" });

    expect(sessionsTab).toHaveAttribute("aria-selected", "true");
    expect(positionsTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(positionsTab);

    expect(sessionsTab).toHaveAttribute("aria-selected", "false");
    expect(positionsTab).toHaveAttribute("aria-selected", "true");
  });
});
