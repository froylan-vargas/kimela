import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQimelas } from "./useQimelas";
import type { QimelasResponse } from "@/types/qimela";

const mockResponse: QimelasResponse = {
  data: [
    {
      id: "1",
      name: "Liga MX",
      sportId: "sport-uuid-1",
      status: "ACTIVE",
      role: "SUBSCRIBER",
      creatorId: "u1",
    },
  ],
  meta: { total: 1, page: 1, limit: 10 },
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useQimelas", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches from the correct URL", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useQimelas(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/qimelas",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("returns parsed qimela data on success", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useQimelas(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe("Liga MX");
  });

  it("sets isError and throws on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useQimelas(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain("Internal Server Error");
    expect(result.current.data).toBeUndefined();
  });
});
