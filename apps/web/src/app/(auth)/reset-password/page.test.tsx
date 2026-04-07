import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
const mockGetSearchParam = vi.fn().mockReturnValue("valid-token");

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGetSearchParam }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/apiClient", () => ({
  authApi: {
    resetPassword: vi.fn(),
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
import ResetPasswordPage from "./page";

// A valid password meeting all requirements: uppercase, lowercase, digit, special char, 8+ chars
const VALID_PASSWORD = "Passw0rd!";

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockGetSearchParam.mockReturnValue("valid-token");
  });

  it("shows error immediately when no token in URL", async () => {
    mockGetSearchParam.mockReturnValue(null);

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(
        screen.getByText("El enlace ha expirado o no es válido."),
      ).toBeInTheDocument();
    });
  });

  it("renders password and confirm password fields when token is present", async () => {
    render(<ResetPasswordPage />);

    expect(
      await screen.findByLabelText(/nueva contraseña/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText(/confirmar contraseña/i),
    ).toBeInTheDocument();
  });

  it("shows validation error when passwords don't match", async () => {
    render(<ResetPasswordPage />);

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);
    const confirmInput = await screen.findByLabelText(/confirmar contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /restablecer contraseña/i,
    });

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
      fireEvent.change(confirmInput, { target: { value: "DifferentPass1!" } });
      fireEvent.click(submitButton);
    });

    expect(
      screen.getByText("Las contraseñas no coinciden."),
    ).toBeInTheDocument();
  });

  it("shows validation error when password doesn't meet complexity requirements", async () => {
    render(<ResetPasswordPage />);

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);
    const confirmInput = await screen.findByLabelText(/confirmar contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /restablecer contraseña/i,
    });

    // Password without uppercase
    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "nouppercase1!" } });
      fireEvent.change(confirmInput, { target: { value: "nouppercase1!" } });
      fireEvent.click(submitButton);
    });

    expect(
      screen.getByText(/al menos 8 caracteres, una mayúscula/i),
    ).toBeInTheDocument();
  });

  it("calls authApi.resetPassword(token, password) on valid submit", async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);

    render(<ResetPasswordPage />);

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);
    const confirmInput = await screen.findByLabelText(/confirmar contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /restablecer contraseña/i,
    });

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
      fireEvent.change(confirmInput, { target: { value: VALID_PASSWORD } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(authApi.resetPassword).toHaveBeenCalledWith(
        "valid-token",
        VALID_PASSWORD,
      );
    });
  });

  it("shows success message '¡Contraseña restablecida correctamente' after success", async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);

    render(<ResetPasswordPage />);

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);
    const confirmInput = await screen.findByLabelText(/confirmar contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /restablecer contraseña/i,
    });

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
      fireEvent.change(confirmInput, { target: { value: VALID_PASSWORD } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/¡Contraseña restablecida correctamente/i),
      ).toBeInTheDocument();
    });
  });

  it("shows error 'El enlace ha expirado o no es válido' on 400 response", async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(
      new ApiError(400, "Bad Request"),
    );

    render(<ResetPasswordPage />);

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);
    const confirmInput = await screen.findByLabelText(/confirmar contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /restablecer contraseña/i,
    });

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
      fireEvent.change(confirmInput, { target: { value: VALID_PASSWORD } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(
        screen.getByText("El enlace ha expirado o no es válido."),
      ).toBeInTheDocument();
    });
  });

  it("redirects to /login after success with 2s delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined);

    render(<ResetPasswordPage />);

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);
    const confirmInput = await screen.findByLabelText(/confirmar contraseña/i);
    const submitButton = await screen.findByRole("button", {
      name: /restablecer contraseña/i,
    });

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: VALID_PASSWORD } });
      fireEvent.change(confirmInput, { target: { value: VALID_PASSWORD } });
      fireEvent.click(submitButton);
    });

    // Wait for success state — findByText uses real polling via MutationObserver
    expect(
      await screen.findByText(/¡Contraseña restablecida correctamente/i),
    ).toBeInTheDocument();

    // Should not have redirected yet
    expect(mockPush).not.toHaveBeenCalled();

    // Advance timers by 2 seconds to trigger the redirect
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockPush).toHaveBeenCalledWith("/login");

    vi.useRealTimers();
  });
});
