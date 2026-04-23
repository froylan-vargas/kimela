import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useSessions } from "./useSessions";
import { adminApi } from "@/lib/apiClient";
import type { Session } from "@/types/session";

vi.mock("@/lib/apiClient", () => ({
  adminApi: {
    getSessions: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockSessions: Session[] = [
  {
    id: "s1",
    name: "Match 1",
    scheduledAt: "2026-04-19T20:00:00.000Z",
    status: "SCHEDULED",
    home: { id: "c1", name: "Team A", imgUrl: null },
    away: { id: "c2", name: "Team B", imgUrl: null },
    score: { home: null, away: null },
  },
];

describe("useSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls adminApi.getSessions with eventId and phaseId when both are provided", async () => {
    vi.mocked(adminApi.getSessions).mockResolvedValue({ data: mockSessions });

    const { result } = renderHook(() => useSessions("e1", "p1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminApi.getSessions).toHaveBeenCalledOnce();
    expect(adminApi.getSessions).toHaveBeenCalledWith("e1", "p1");
    expect(result.current.data).toEqual(mockSessions);
  });

  it("query is disabled when phaseId is null", () => {
    const { result } = renderHook(() => useSessions("e1", null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(adminApi.getSessions).not.toHaveBeenCalled();
  });

  it("query is disabled when eventId is null", () => {
    const { result } = renderHook(() => useSessions(null, "p1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(adminApi.getSessions).not.toHaveBeenCalled();
  });

  it("query is disabled when both eventId and phaseId are null", () => {
    const { result } = renderHook(() => useSessions(null, null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(adminApi.getSessions).not.toHaveBeenCalled();
  });
});
