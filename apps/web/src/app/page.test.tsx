import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "./page";
import { useKimelaContext } from "@/context/KimelaContext";
import type { Kimela } from "@/types/kimela";

vi.mock("@/context/KimelaContext");

const subscriberKimela: Kimela = {
  id: "s1",
  name: "Liga MX",
  description: "Fútbol mexicano",
  sport: "football",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const creatorKimela: Kimela = {
  id: "c1",
  name: "NBA Pool",
  description: "Basketball pool",
  sport: "basketball",
  status: "ACTIVE",
  role: "CREATOR",
  creatorId: "u1",
};

describe("Home page", () => {
  it("renders ParticipantDashboard when selectedKimela with viewAs SUBSCRIBER", () => {
    vi.mocked(useKimelaContext).mockReturnValue({
      selectedKimela: subscriberKimela,
      viewAs: "SUBSCRIBER",
      selectKimela: vi.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Liga MX - Participant")).toBeInTheDocument();
  });

  it("renders CreatorDashboard when selectedKimela with viewAs CREATOR", () => {
    vi.mocked(useKimelaContext).mockReturnValue({
      selectedKimela: creatorKimela,
      viewAs: "CREATOR",
      selectKimela: vi.fn(),
    });

    render(<Home />);

    expect(screen.getByText("NBA Pool - Creator")).toBeInTheDocument();
  });

  it("renders fallback text when no kimela is selected", () => {
    vi.mocked(useKimelaContext).mockReturnValue({
      selectedKimela: null,
      viewAs: null,
      selectKimela: vi.fn(),
    });

    render(<Home />);

    expect(
      screen.getByText("Select a kimela to get started."),
    ).toBeInTheDocument();
  });

  it("does not render any dashboard when selectedKimela is null", () => {
    vi.mocked(useKimelaContext).mockReturnValue({
      selectedKimela: null,
      viewAs: null,
      selectKimela: vi.fn(),
    });

    render(<Home />);

    expect(screen.queryByText(/Participant/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Creator/)).not.toBeInTheDocument();
  });
});
