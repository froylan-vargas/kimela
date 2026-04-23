import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SessionList from "./SessionList";
import type { Session } from "@/types/session";

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

describe("SessionList", () => {
  it("renders loading skeletons when isLoading is true", () => {
    render(<SessionList sessions={[]} isLoading={true} isError={false} />);

    expect(screen.getByLabelText("Cargando partidos")).toBeInTheDocument();
  });

  it("renders error message when isError is true", () => {
    render(<SessionList sessions={[]} isLoading={false} isError={true} />);

    expect(screen.getByText(/Error al cargar los partidos/)).toBeInTheDocument();
  });

  it("renders empty state when sessions is empty and not loading", () => {
    render(<SessionList sessions={[]} isLoading={false} isError={false} />);

    expect(screen.getByText(/No hay partidos en esta fase/)).toBeInTheDocument();
  });

  it("renders a card for each session with home name, vs, and away name", () => {
    const sessions = [
      makeSession({ id: "s1", home: { id: "c1", name: "Real Madrid", imgUrl: null }, away: { id: "c2", name: "Barcelona", imgUrl: null } }),
      makeSession({ id: "s2", home: { id: "c3", name: "Atletico", imgUrl: null }, away: { id: "c4", name: "Sevilla", imgUrl: null } }),
    ];

    render(<SessionList sessions={sessions} isLoading={false} isError={false} />);

    expect(screen.getByText("Real Madrid")).toBeInTheDocument();
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
    expect(screen.getByText("Atletico")).toBeInTheDocument();
    expect(screen.getByText("Sevilla")).toBeInTheDocument();
    expect(screen.getAllByText("vs")).toHaveLength(2);
  });

  it("renders contender image when imgUrl is provided", () => {
    const session = makeSession({
      home: { id: "c1", name: "Real Madrid", imgUrl: "https://example.com/logo.png" },
      away: { id: "c2", name: "Barcelona", imgUrl: null },
    });

    render(<SessionList sessions={[session]} isLoading={false} isError={false} />);

    const img = screen.getByRole("img", { name: "Real Madrid" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("renders fallback element (no img) when imgUrl is null", () => {
    const session = makeSession({
      home: { id: "c1", name: "Team A", imgUrl: null },
      away: { id: "c2", name: "Team B", imgUrl: null },
    });

    render(<SessionList sessions={[session]} isLoading={false} isError={false} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("sorts sessions by scheduledAt ascending", () => {
    const sessions = [
      makeSession({ id: "s1", scheduledAt: "2026-04-19T22:00:00.000Z", home: { id: "c1", name: "Team C", imgUrl: null }, away: { id: "c2", name: "Team D", imgUrl: null } }),
      makeSession({ id: "s2", scheduledAt: "2026-04-19T18:00:00.000Z", home: { id: "c3", name: "Team A", imgUrl: null }, away: { id: "c4", name: "Team B", imgUrl: null } }),
    ];

    render(<SessionList sessions={sessions} isLoading={false} isError={false} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Team A");
    expect(items[1]).toHaveTextContent("Team C");
  });

  it("displays time in UTC (not local-converted)", () => {
    const session = makeSession({
      scheduledAt: "2026-04-19T20:00:00.000Z",
    });

    render(<SessionList sessions={[session]} isLoading={false} isError={false} />);

    expect(screen.getByText(/20:00/)).toBeInTheDocument();
  });
});
