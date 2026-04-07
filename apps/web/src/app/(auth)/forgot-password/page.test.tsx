import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPasswordPage from "./page";

vi.mock("@/lib/apiClient", () => ({
  authApi: {
    forgotPassword: vi.fn(),
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

import { authApi } from "@/lib/apiClient";

const SUCCESS_MESSAGE =
  "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email field and submit button", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enviar enlace/i }),
    ).toBeInTheDocument();
  });

  it("shows the success message after successful submit", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitButton = screen.getByRole("button", { name: /enviar enlace/i });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: "test@example.com" },
      });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    });
  });

  it("shows the success message even when API throws (never reveals if email exists)", async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(
      new Error("Not found"),
    );

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitButton = screen.getByRole("button", { name: /enviar enlace/i });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: "nonexistent@example.com" },
      });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    });
  });

  it("always shows generic success message after submit, regardless of API outcome", async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(undefined);

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitButton = screen.getByRole("button", { name: /enviar enlace/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "any@example.com" } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    });

    // The form should be gone after submission
    expect(
      screen.queryByRole("button", { name: /enviar enlace/i }),
    ).not.toBeInTheDocument();
  });

  it("'Volver a iniciar sesión' link points to /login", () => {
    render(<ForgotPasswordPage />);

    const link = screen.getByText(/volver a iniciar sesión/i);
    expect(link.closest("a")).toHaveAttribute("href", "/login");
  });
});
