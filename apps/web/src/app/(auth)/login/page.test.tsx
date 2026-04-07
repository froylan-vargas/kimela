import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "./page";
import { ApiError } from "@/lib/apiClient";

const mockPush = vi.fn();
const mockGetSearchParam = vi.fn().mockReturnValue(null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGetSearchParam }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({ login: vi.fn() }),
}));

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
    mockGetSearchParam.mockReturnValue(null);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
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

  it("shows 'Algo salió mal, intenta de nuevo' on generic error", async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
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
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
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
  });
});
