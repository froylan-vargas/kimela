import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "./(app)/dashboard/page";
import { useQimelaContext } from "@/context/QimelaContext";
import type { Qimela } from "@/types/qimela";

vi.mock("@/context/QimelaContext");

const subscriberQimela: Qimela = {
  id: "s1",
  name: "Liga MX",
  sportId: "sport-uuid-1",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const creatorQimela: Qimela = {
  id: "c1",
  name: "NBA Pool",
  sportId: "sport-uuid-2",
  status: "ACTIVE",
  role: "CREATOR",
  creatorId: "u1",
};

describe("Home page", () => {
  it("renders ParticipantDashboard when selectedQimela with viewAs SUBSCRIBER", () => {
    vi.mocked(useQimelaContext).mockReturnValue({
      selectedQimela: subscriberQimela,
      viewAs: "SUBSCRIBER",
      selectQimela: vi.fn(),
      clearQimela: vi.fn(),
    });

    render(<Home />);

    expect(screen.getByText("Liga MX - Participant")).toBeInTheDocument();
  });

  it("renders CreatorDashboard when selectedQimela with viewAs CREATOR", () => {
    vi.mocked(useQimelaContext).mockReturnValue({
      selectedQimela: creatorQimela,
      viewAs: "CREATOR",
      selectQimela: vi.fn(),
      clearQimela: vi.fn(),
    });

    render(<Home />);

    expect(screen.getByText("NBA Pool - Creator")).toBeInTheDocument();
  });

  it("renders fallback text when no qimela is selected", () => {
    vi.mocked(useQimelaContext).mockReturnValue({
      selectedQimela: null,
      viewAs: null,
      selectQimela: vi.fn(),
      clearQimela: vi.fn(),
    });

    render(<Home />);

    expect(
      screen.getByText("Select a qimela to get started."),
    ).toBeInTheDocument();
  });

  it("does not render any dashboard when selectedQimela is null", () => {
    vi.mocked(useQimelaContext).mockReturnValue({
      selectedQimela: null,
      viewAs: null,
      selectQimela: vi.fn(),
      clearQimela: vi.fn(),
    });

    render(<Home />);

    expect(screen.queryByText(/Participant/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Creator/)).not.toBeInTheDocument();
  });
});
