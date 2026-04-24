import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAllQimelaSessions,
  useUpcomingSessions,
} from "./useUpcomingSessions";
import { qimelasApi } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  qimelasApi: {
    getUpcomingSessions: vi.fn(),
    getAllSessions: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useUpcomingSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads upcoming sessions grouped by phase", async () => {
    vi.mocked(qimelasApi.getUpcomingSessions).mockResolvedValue({
      data: [
        {
          phaseId: "p1",
          phaseName: "Jornada 1",
          phaseOrder: 1,
          sessions: [
            {
              id: "s1",
              name: "Match 1",
              scheduledAt: new Date(Date.now() + 10 * 60_000).toISOString(),
              status: "SCHEDULED",
              phaseId: "p1",
              phaseName: "Jornada 1",
              score: { home: null, away: null },
              home: { id: "h1", name: "Atlas", imgUrl: null },
              away: { id: "a1", name: "América", imgUrl: null },
              hasUserPicks: false,
              picks: [],
            },
          ],
        },
        {
          phaseId: "p2",
          phaseName: "Jornada 2",
          phaseOrder: 2,
          sessions: [
            {
              id: "s2",
              name: "Match 2",
              scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
              status: "SCHEDULED",
              phaseId: "p2",
              phaseName: "Jornada 2",
              score: { home: null, away: null },
              home: { id: "h2", name: "Tigres", imgUrl: null },
              away: { id: "a2", name: "Pumas", imgUrl: null },
              hasUserPicks: false,
              picks: [],
            },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useUpcomingSessions("q1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(qimelasApi.getUpcomingSessions).toHaveBeenCalledWith("q1");
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].phaseId).toBe("p1");
    expect(result.current.data?.[1].sessions[0].id).toBe("s2");
  });

  it("loads all sessions grouped by phase", async () => {
    vi.mocked(qimelasApi.getAllSessions).mockResolvedValue({
      data: [
        {
          phaseId: "p1",
          phaseName: "Jornada 1",
          phaseOrder: 1,
          sessions: [
            {
              id: "s1",
              name: "Match 1",
              scheduledAt: new Date(Date.now() + 10 * 60_000).toISOString(),
              status: "SCHEDULED",
              phaseId: "p1",
              phaseName: "Jornada 1",
              score: { home: null, away: null },
              home: { id: "h1", name: "Atlas", imgUrl: null },
              away: { id: "a1", name: "América", imgUrl: null },
              hasUserPicks: false,
              picks: [],
            },
          ],
        },
        {
          phaseId: "p2",
          phaseName: "Jornada 2",
          phaseOrder: 2,
          sessions: [
            {
              id: "s2",
              name: "Match 2",
              scheduledAt: new Date(Date.now() + 10 * 24 * 60 * 60_000).toISOString(),
              status: "SCHEDULED",
              phaseId: "p2",
              phaseName: "Jornada 2",
              score: { home: null, away: null },
              home: { id: "h2", name: "Tigres", imgUrl: null },
              away: { id: "a2", name: "Pumas", imgUrl: null },
              hasUserPicks: true,
              picks: [],
            },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useAllQimelaSessions("q1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(qimelasApi.getAllSessions).toHaveBeenCalledWith("q1");
    expect(result.current.data?.[0].phaseId).toBe("p1");
    expect(result.current.data?.[1].sessions[0].id).toBe("s2");
  });
});
