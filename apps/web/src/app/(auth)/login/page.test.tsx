import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "./page";
import { ApiError, authApi } from "@/lib/apiClient";

const {
  mockPush,
  mockGetSearchParam,
  mockFetchQuery,
  mockSelectQimela,
  mockClearQimela,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGetSearchParam: vi.fn().mockReturnValue(null),
  mockFetchQuery: vi.fn(),
  mockSelectQimela: vi.fn(),
  mockClearQimela: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ fetchQuery: mockFetchQuery }),
}));

vi.mock("@/context/QimelaContext", () => ({
  useQimelaContext: () => ({
    selectQimela: mockSelectQimela,
    clearQimela: mockClearQimela,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({ login: vi.fn() }),
}));

vi.mock("@/lib/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiClient")>(
    "@/lib/apiClient"
  );

  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      resendVerification: vi.fn(),
    },
  };
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { useAuth } from "@/hooks/useAuth";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockFetchQuery.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10 },
    });
    mockGetSearchParam.mockReturnValue(null);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  it("renders email and password fields", async () => {
    render(<LoginPage />);

    expect(
      await screen.findByLabelText(/correo electrónico/i),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it("renders submit button", async () => {
    render(<LoginPage />);

    expect(
      await screen.findByRole("button", { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it("renders '¿Olvidaste tu contraseña?' link pointing to /forgot-password", async () => {
    render(<LoginPage />);

    const link = await screen.findByText(/¿olvidaste tu contraseña\?/i);
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/forgot-password");
  });

  it("calls login(email, password) on form submit", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<LoginPage />);

    const emailInput = await screen.findByLabelText(/correo electrónico/i);
    const passwordInput = await screen.findByLabelText(/contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /iniciar sesión/i,
    });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("shows 'Correo o contraseña incorrectos' when login throws ApiError(401)", async () => {
    const mockLogin = vi
      .fn()
      .mockRejectedValue(new ApiError(401, "Unauthorized"));
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<LoginPage />);

    const emailInput = await screen.findByLabelText(/correo electrónico/i);
    const passwordInput = await screen.findByLabelText(/contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /iniciar sesión/i,
    });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "bad@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
      fireEvent.click(submitButton);
    });

    expect(
      await screen.findByText("Correo o contraseña incorrectos"),
    ).toBeInTheDocument();
  });

  it("shows verification guidance and resend button when login fails because email is not verified", async () => {
    const mockLogin = vi
      .fn()
      .mockRejectedValue(
        new ApiError(401, "Email not verified", "EMAIL_NOT_VERIFIED")
      );
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<LoginPage />);

    await act(async () => {
      fireEvent.change(await screen.findByLabelText(/correo electrónico/i), {
        target: { value: "pending@example.com" },
      });
      fireEvent.change(await screen.findByLabelText(/contraseña/i), {
        target: { value: "password123" },
      });
      fireEvent.click(
        await screen.findByRole("button", { name: /iniciar sesión/i })
      );
    });

    expect(
      await screen.findByText(/tu correo todavía no ha sido verificado/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reenviar correo de verificación/i })
    ).toBeInTheDocument();
  });

  it("resends verification email from login when account is pending verification", async () => {
    const mockLogin = vi
      .fn()
      .mockRejectedValue(
        new ApiError(401, "Email not verified", "EMAIL_NOT_VERIFIED")
      );
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
    vi.mocked(authApi.resendVerification).mockResolvedValue(undefined);

    render(<LoginPage />);

    await act(async () => {
      fireEvent.change(await screen.findByLabelText(/correo electrónico/i), {
        target: { value: "pending@example.com" },
      });
      fireEvent.change(await screen.findByLabelText(/contraseña/i), {
        target: { value: "password123" },
      });
      fireEvent.click(
        await screen.findByRole("button", { name: /iniciar sesión/i })
      );
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /reenviar correo de verificación/i })
      );
    });

    expect(authApi.resendVerification).toHaveBeenCalledWith(
      "pending@example.com"
    );
    expect(
      await screen.findByText(/si tu cuenta sigue pendiente de verificación/i)
    ).toBeInTheDocument();
  });

  it("shows 'Algo salió mal, intenta de nuevo' on generic error", async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<LoginPage />);

    const emailInput = await screen.findByLabelText(/correo electrónico/i);
    const passwordInput = await screen.findByLabelText(/contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /iniciar sesión/i,
    });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    expect(
      await screen.findByText("Algo salió mal, intenta de nuevo"),
    ).toBeInTheDocument();
  });

  it("redirects to /dashboard after successful login (default redirect)", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      id: "u1",
      name: "Test User",
      email: "test@example.com",
      role: "USER",
      emailVerifiedAt: null,
      imageUrl: null,
    });
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<LoginPage />);

    const emailInput = await screen.findByLabelText(/correo electrónico/i);
    const passwordInput = await screen.findByLabelText(/contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /iniciar sesión/i,
    });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to ?redirect= value after successful login when param is set", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    // Override the search param for this test
    mockGetSearchParam.mockReturnValue("/profile");

    render(<LoginPage />);

    const emailInput = await screen.findByLabelText(/correo electrónico/i);
    const passwordInput = await screen.findByLabelText(/contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /iniciar sesión/i,
    });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/profile");
    });
    expect(mockFetchQuery).not.toHaveBeenCalled();
  });

  it("selects the newest subscribed qimela after successful login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      id: "u1",
      name: "Test User",
      email: "test@example.com",
      role: "USER",
      emailVerifiedAt: null,
      imageUrl: null,
    });
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
    const newest = {
      id: "q-new",
      name: "Qimela nueva",
      sportId: "sport-1",
      status: "ACTIVE",
      role: "SUBSCRIBER" as const,
      creatorId: "creator-1",
      createdAt: "2026-02-01T00:00:00.000Z",
    };
    mockFetchQuery.mockResolvedValue({
      data: [
        {
          ...newest,
          id: "q-old",
          name: "Qimela vieja",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        newest,
      ],
      meta: { total: 2, page: 1, limit: 10 },
    });

    render(<LoginPage />);

    await act(async () => {
      fireEvent.change(await screen.findByLabelText(/correo electrónico/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(await screen.findByLabelText(/contraseña/i), {
        target: { value: "password123" },
      });
      fireEvent.click(
        await screen.findByRole("button", { name: /iniciar sesión/i }),
      );
    });

    await waitFor(() => {
      expect(mockSelectQimela).toHaveBeenCalledWith(newest, "SUBSCRIBER");
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
