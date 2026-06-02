import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "./(app)/dashboard/page";
import { useQimelaContext } from "@/context/QimelaContext";
import { useQimelas } from "@/hooks/useQimelas";
import type { qimela, QimelasResponse } from "@/types/qimela";
import type { UseQueryResult } from "@tanstack/react-query";

vi.mock("@/context/QimelaContext");
vi.mock("@/hooks/useQimelas");
vi.mock("@/components/dashboard/ParticipantDashboard", () => ({
  default: ({ qimela }: { qimela: qimela }) => (
    <div>{qimela.name} - Participant</div>
  ),
}));
vi.mock("@/components/dashboard/CreatorDashboard", () => ({
  default: ({ qimela }: { qimela: qimela }) => (
    <div>{qimela.name} - Creator</div>
  ),
}));

const subscriberQimela: qimela = {
  id: "s1",
  name: "Liga MX",
  sportId: "sport-uuid-1",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const creatorQimela: qimela = {
  id: "c1",
  name: "NBA Pool",
  sportId: "sport-uuid-2",
  status: "ACTIVE",
  role: "CREATOR",
  creatorId: "u1",
};

function mockUseQimelas(data: QimelasResponse["data"] = [subscriberQimela]) {
  vi.mocked(useQimelas).mockReturnValue({
    data: { data, meta: { total: data.length, page: 1, limit: 10 } },
    isLoading: false,
    isError: false,
    isPending: false,
    isSuccess: true,
    error: null,
  } as UseQueryResult<QimelasResponse, Error>);
}

describe("Home page", () => {
  beforeEach(() => {
    mockUseQimelas();
  });

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

  it("renders fallback text when subscribed qimelas exist but no qimela is selected", () => {
    vi.mocked(useQimelaContext).mockReturnValue({
      selectedQimela: null,
      viewAs: null,
      selectQimela: vi.fn(),
      clearQimela: vi.fn(),
    });

    render(<Home />);

    expect(
      screen.getByText("Selecciona una qimela para empezar."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /¡También puedes crear\s+tu propia qimela!/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders an invite prompt when no subscribed qimelas exist", () => {
    mockUseQimelas([]);
    vi.mocked(useQimelaContext).mockReturnValue({
      selectedQimela: null,
      viewAs: null,
      selectQimela: vi.fn(),
      clearQimela: vi.fn(),
    });

    render(<Home />);

    expect(
      screen.queryByText("Selecciona una qimela para empezar."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Aún no te has suscrito a ninguna qimela 😢\s+¡Pide que te inviten a la quiniela del mundial!/i,
      }),
    ).toBeInTheDocument();
  });

  it("does not render the create step cards when no qimela is selected", () => {
    vi.mocked(useQimelaContext).mockReturnValue({
      selectedQimela: null,
      viewAs: null,
      selectQimela: vi.fn(),
      clearQimela: vi.fn(),
    });

    render(<Home />);

    expect(screen.queryByText("Crea tu qimela")).not.toBeInTheDocument();
    expect(screen.queryByText("Invita a tus amigos")).not.toBeInTheDocument();
    expect(screen.queryByText("¡Diviértanse!")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "+ Crea tu qimela" }),
    ).not.toBeInTheDocument();
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
