import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelectQimela = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "qimela-uuid" }),
}));

vi.mock("@/hooks/useUpcomingSessions", () => ({
  useAllQimelaSessions: () => ({
    data: [],
    isLoading: false,
    isError: false,
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
          creatorId: "user-1",
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

vi.mock("@/components/qimela/SessionCard/SessionCard", () => ({
  default: () => <div>Session card</div>,
}));

vi.mock("./page.module.scss", () => ({ default: {} }));

import QimelaSessionsPage from "./page";

describe("QimelaSessionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores the current qimela selection from the route", async () => {
    render(<QimelaSessionsPage />);

    await waitFor(() => {
      expect(mockSelectQimela).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "qimela-uuid",
          name: "Liga MX",
        }),
        "SUBSCRIBER",
      );
    });
  });

  it("links back to the dashboard", () => {
    render(<QimelaSessionsPage />);

    expect(
      screen.getByRole("link", { name: "Volver al dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
