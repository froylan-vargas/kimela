import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Qimela } from "@/types/qimela";
import ParticipantDashboard from "./ParticipantDashboard";

vi.mock("@/components/dashboard/TablePositions", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/dashboard/TablePositions")
  >("@/components/dashboard/TablePositions");

  return {
    ...actual,
    default: ({ qimelaName }: { qimelaName: string }) => (
      <div>Tabla {qimelaName}</div>
    ),
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

    const sessionsTab = screen.getByRole("tab", { name: "Partidos" });
    const positionsTab = screen.getByRole("tab", { name: "Posiciones" });

    expect(sessionsTab).toHaveAttribute("aria-selected", "true");
    expect(positionsTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Tu posición:")).toBeInTheDocument();
    expect(screen.getByText("110 pts")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "3 abiertos"),
    ).toBeInTheDocument();

    fireEvent.click(positionsTab);

    expect(sessionsTab).toHaveAttribute("aria-selected", "false");
    expect(positionsTab).toHaveAttribute("aria-selected", "true");
  });
});
