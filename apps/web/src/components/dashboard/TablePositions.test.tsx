import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TablePositions from "./TablePositions";

vi.mock("@/hooks/useQimelaPhases", () => ({
  useQimelaPhases: () => ({ data: [] }),
}));

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    data: [
      {
        userId: "1",
        userName: "Ana Torres",
        initials: "AT",
        totalPoints: 124,
        correctPicksCount: 18,
        exactResultsCount: 5,
        rank: 1,
        isCurrentUser: false,
      },
      {
        userId: "2",
        userName: "Froylan Vargas",
        initials: "FV",
        imageUrl: "https://example.com/avatar.jpg",
        totalPoints: 110,
        correctPicksCount: 16,
        exactResultsCount: 3,
        rank: 2,
        isCurrentUser: true,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

describe("TablePositions", () => {
  it("renders the heading", () => {
    render(<TablePositions qimelaId="qimela-1" currentUserId="2" />);
    expect(screen.getByRole("heading", { name: "Posiciones" })).toBeInTheDocument();
  });

  it("renders participant names", () => {
    render(<TablePositions qimelaId="qimela-1" currentUserId="2" />);
    expect(screen.getAllByText("Ana Torres").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Froylan Vargas").length).toBeGreaterThan(0);
  });

  it("marks the current user with Tú badge", () => {
    render(<TablePositions qimelaId="qimela-1" currentUserId="2" />);
    expect(screen.getAllByText("Tú").length).toBeGreaterThan(0);
  });

  it("renders the current user's avatar image in both responsive layouts", () => {
    render(<TablePositions qimelaId="qimela-1" currentUserId="2" />);
    const avatars = screen.getAllByRole("img", { hidden: true });

    expect(avatars).toHaveLength(2);
    avatars.forEach((avatar) => {
      expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });
  });

  it("renders a link to the results page", () => {
    render(<TablePositions qimelaId="qimela-1" currentUserId="2" />);
    const link = screen.getByRole("link", { name: "Ver resultados" });
    expect(link).toHaveAttribute("href", "/qimela/qimela-1/results");
  });

  it("renders desktop headers in the expected order", () => {
    render(<TablePositions qimelaId="qimela-1" currentUserId="2" />);
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "Pos.",
      "Participante",
      "Puntos",
      "Aciertos",
      "Exactos",
    ]);
  });
});
