import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSelectQimela,
  mockUseQimelaResults,
} = vi.hoisted(() => ({
  mockSelectQimela: vi.fn(),
  mockUseQimelaResults: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "qimela-uuid" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Ana Torres",
      email: "ana@example.com",
      role: "USER",
      emailVerifiedAt: null,
      imageUrl: null,
    },
  }),
}));

vi.mock("@/hooks/useQimelas", () => ({
  useQimelas: () => ({
    data: {
      data: [
        {
          id: "qimela-uuid",
          name: "Liga MX",
          sportId: "sport-1",
          status: "ACTIVE",
          role: "SUBSCRIBER",
          creatorId: "user-2",
        },
      ],
    },
  }),
}));

vi.mock("@/context/QimelaContext", () => ({
  useQimelaContext: () => ({
    selectedQimela: null,
    viewAs: null,
    selectQimela: mockSelectQimela,
    clearQimela: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQimelaPhases", () => ({
  useQimelaPhases: () => ({
    data: [
      { id: "phase-1", name: "Jornada 1", order: 1, status: "COMPLETED" },
      { id: "phase-2", name: "Jornada 2", order: 2, status: "ACTIVE" },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    data: [],
  }),
}));

vi.mock("@/hooks/useQimelaResults", () => ({
  useQimelaResults: mockUseQimelaResults,
}));

vi.mock("@/components/qimela/ResultsComparison/UserCompareSelector", () => ({
  default: () => <div />,
}));

vi.mock("@/components/qimela/ResultsComparison/ComparisonCard", () => ({
  default: () => <div />,
}));

vi.mock("./page.module.scss", () => ({ default: {} }));

import QimelaResultsPage from "./page";

describe("QimelaResultsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQimelaResults.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it("selects the current active phase by default", async () => {
    render(<QimelaResultsPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Fase" })).toHaveValue("phase-2");
    });

    expect(mockUseQimelaResults).toHaveBeenLastCalledWith(
      "qimela-uuid",
      "phase-2",
      [],
    );
  });
});
