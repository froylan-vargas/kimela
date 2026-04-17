import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthContext } from "./AuthContext";
import type { AuthUser } from "@/types/auth";

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

import { authApi, ApiError } from "@/lib/apiClient";

const mockUser: AuthUser = {
  id: "u1",
  name: "Test User",
  email: "test@example.com",
  role: "USER",
  emailVerifiedAt: null,
};

function renderWithAuth(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

function TestConsumer() {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initial state: isLoading=true, user=null before /auth/me resolves", async () => {
    let resolve!: (user: AuthUser) => void;
    vi.mocked(authApi.me).mockReturnValue(
      new Promise<AuthUser>((res) => {
        resolve = res;
      }),
    );

    renderWithAuth(<TestConsumer />);

    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("null");

    await act(async () => {
      resolve(mockUser);
    });
  });

  it("authenticated: sets user and isLoading=false after authApi.me resolves", async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);

    renderWithAuth(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
  });

  it("unauthenticated: sets user=null and isLoading=false after ApiError(401)", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "Unauthorized"));

    renderWithAuth(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
  });

  it("login: calls authApi.login and sets user on success", async () => {
    vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "Unauthorized"));
    vi.mocked(authApi.login).mockResolvedValue(mockUser);

    function LoginTrigger() {
      const { login, user } = useAuthContext();
      return (
        <div>
          <span data-testid="user">{user ? user.email : "null"}</span>
          <button onClick={() => login("test@example.com", "password123")}>
            Login
          </button>
        </div>
      );
    }

    renderWithAuth(<LoginTrigger />);

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("null");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    });
  });

  it("logout: calls authApi.logout and sets user=null", async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    function LogoutTrigger() {
      const { logout, user } = useAuthContext();
      return (
        <div>
          <span data-testid="user">{user ? user.email : "null"}</span>
          <button onClick={() => logout()}>Logout</button>
        </div>
      );
    }

    renderWithAuth(<LogoutTrigger />);

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("test@example.com");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Logout" }).click();
    });

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalled();
      expect(screen.getByTestId("user").textContent).toBe("null");
    });
  });

  it("throws when useAuthContext is used outside AuthProvider", () => {
    function BadConsumer() {
      useAuthContext();
      return null;
    }

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    expect(() => render(<BadConsumer />)).toThrow(
      "useAuthContext must be used inside AuthProvider",
    );

    consoleSpy.mockRestore();
  });
});
