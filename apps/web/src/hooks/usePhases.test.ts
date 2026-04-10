import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePhases } from "./usePhases";
import { adminApi } from "@/lib/apiClient";
import type { Phase } from "@/types/phase";

vi.mock("@/lib/apiClient", () => ({
  adminApi: {
    getPhases: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockPhases: Phase[] = [
  { id: "p1", name: "Jornada 1", order: 1, type: "REGULAR_SEASON", eventId: "e1" },
  { id: "p2", name: "Playoffs", order: 2, type: "PLAYOFFS", eventId: "e1" },
];

describe("usePhases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls adminApi.getPhases with the eventId and returns phases data", async () => {
    vi.mocked(adminApi.getPhases).mockResolvedValue({ data: mockPhases });

    const { result } = renderHook(() => usePhases("e1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminApi.getPhases).toHaveBeenCalledOnce();
    expect(adminApi.getPhases).toHaveBeenCalledWith("e1");
    expect(result.current.data).toEqual(mockPhases);
  });

  it("query is enabled when eventId is provided", async () => {
    vi.mocked(adminApi.getPhases).mockResolvedValue({ data: mockPhases });

    const { result } = renderHook(() => usePhases("e1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminApi.getPhases).toHaveBeenCalled();
  });

  it("query is disabled when eventId is empty string", () => {
    const { result } = renderHook(() => usePhases(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(adminApi.getPhases).not.toHaveBeenCalled();
  });
});
