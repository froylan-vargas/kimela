import { render, screen, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetSearchParam = vi.fn().mockReturnValue("valid-token");

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGetSearchParam }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/apiClient", () => ({
  authApi: {
    confirmEmail: vi.fn(),
    resendVerification: vi.fn(),
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

import { authApi, ApiError } from "@/lib/apiClient";
import ConfirmEmailPage from "./page";

describe("ConfirmEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue("valid-token");
  });

  it("shows 'Verificando...' while loading", async () => {
    let resolve!: () => void;
    vi.mocked(authApi.confirmEmail).mockReturnValue(
      new Promise<void>((res) => {
        resolve = res;
      }),
    );

    render(<ConfirmEmailPage />);

    expect(await screen.findByText("Verificando...")).toBeInTheDocument();

    await act(async () => {
      resolve();
    });
  });

  it("shows success message '¡Correo verificado!' after confirmEmail resolves", async () => {
    vi.mocked(authApi.confirmEmail).mockResolvedValue(undefined);

    render(<ConfirmEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/¡Correo verificado!/i)).toBeInTheDocument();
    });
  });

  it("shows error message 'El enlace ha expirado o no es válido' after confirmEmail rejects with 400", async () => {
    vi.mocked(authApi.confirmEmail).mockRejectedValue(
      new ApiError(400, "Bad Request"),
    );

    render(<ConfirmEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText("El enlace ha expirado o no es válido."),
      ).toBeInTheDocument();
    });
  });

  it("shows 'Iniciar sesión' link when user is not authenticated and token is invalid", async () => {
    vi.mocked(authApi.confirmEmail).mockRejectedValue(
      new ApiError(400, "Bad Request"),
    );

    render(<ConfirmEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/vuelve a iniciar sesión para solicitar un nuevo correo/i),
      ).toBeInTheDocument();
      const loginLink = screen.getByText("Iniciar sesión");
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
    });
  });

  it("shows error message immediately when no token in URL", async () => {
    mockGetSearchParam.mockReturnValue(null);

    render(<ConfirmEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText("El enlace ha expirado o no es válido."),
      ).toBeInTheDocument();
    });

    expect(authApi.confirmEmail).not.toHaveBeenCalled();
  });
});
