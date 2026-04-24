import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ComparisonSession } from "@/lib/apiClient";
import ComparisonCard from "./ComparisonCard";

const baseSession: ComparisonSession = {
  id: "session-1",
  name: "Italia vs México",
  scheduledAt: "2026-04-20T20:00:00.000",
  phaseId: "phase-1",
  phaseName: "Jornada 1",
  home: { id: "home", name: "Italia", imgUrl: null },
  away: { id: "away", name: "México", imgUrl: null },
  actualResult: { homeScore: "2", awayScore: "1" },
  users: [
    {
      userId: "me",
      userName: "Froilan",
      homePick: "2",
      awayPick: "1",
      points: 3,
    },
    {
      userId: "laura",
      userName: "Laura",
      homePick: "1",
      awayPick: "0",
      points: 1,
    },
  ],
};

describe("ComparisonCard", () => {
  it("renders real result score", () => {
    render(<ComparisonCard session={baseSession} currentUserId="me" />);
    expect(screen.getByText("Italia")).toBeInTheDocument();
    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("labels the current user as 'Tú' and shows first", () => {
    render(<ComparisonCard session={baseSession} currentUserId="me" />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Tú");
    expect(rows[1]).toHaveTextContent("Laura");
  });

  it("renders user picks with points", () => {
    render(<ComparisonCard session={baseSession} currentUserId="me" />);
    expect(screen.getByText("+3 Pts")).toBeInTheDocument();
    expect(screen.getByText("+1 Pts")).toBeInTheDocument();
  });

  it("shows '-' when actual result is missing", () => {
    const session: ComparisonSession = {
      ...baseSession,
      actualResult: { homeScore: null, awayScore: null },
    };
    render(<ComparisonCard session={session} currentUserId="me" />);
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows '-' when a user has no picks and no points", () => {
    const session: ComparisonSession = {
      ...baseSession,
      users: [
        {
          userId: "me",
          userName: "Froilan",
          homePick: null,
          awayPick: null,
          points: null,
        },
      ],
    };
    render(<ComparisonCard session={session} currentUserId="me" />);
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);
  });
});
