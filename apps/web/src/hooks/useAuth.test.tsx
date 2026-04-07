import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import type { AuthUser } from "@/types/auth";
import { useAuth, useRequireAuth, useRequireRole } from "./useAuth";

vi.mock("@/lib/apiClient", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => "/",
}));

import { authApi, ApiError } from "@/lib/apiClient";

const mockUser: AuthUser = {
  id: "u1",
  name: "Test User",
  email: "test@example.com",
  role: "USER",
  emailVerifiedAt: null,
};

const adminUser: AuthUser = {
  id: "u2",
  name: "Admin User",
  email: "admin@example.com",
  role: "ADMIN",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
};

function makeWrapper(user: AuthUser | null = null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the context value", async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(mockUser),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("throws when used outside AuthProvider", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuthContext must be used inside AuthProvider",
    );

    consoleSpy.mockRestore();
  });
});

describe("useRequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace.mockClear();
  });

  it("returns user when authenticated", async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useRequireAuth(), {
      wrapper: makeWrapper(mockUser),
    });

    await waitFor(() => {
      expect(result.current).toEqual(mockUser);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("calls router.replace('/login') when isLoading=false and user=null", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "Unauthorized"));

    renderHook(() => useRequireAuth(), {
      wrapper: makeWrapper(null),
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});

describe("useRequireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace.mockClear();
  });

  it("returns user when role matches", async () => {
    vi.mocked(authApi.me).mockResolvedValue(adminUser);

    const { result } = renderHook(() => useRequireRole("ADMIN"), {
      wrapper: makeWrapper(adminUser),
    });

    await waitFor(() => {
      expect(result.current).toEqual(adminUser);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("calls router.replace('/login') when role doesn't match", async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);

    renderHook(() => useRequireRole("ADMIN"), {
      wrapper: makeWrapper(mockUser),
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
