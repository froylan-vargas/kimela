import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "abc123" }),
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/lib/apiClient", () => ({
  inviteApi: {
    getByToken: vi.fn(),
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

vi.mock("@/context/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("./page.module.scss", () => ({ default: {} }));

import { inviteApi, ApiError } from "@/lib/apiClient";
import { useAuthContext } from "@/context/AuthContext";
import InvitePage from "./page";
import type { AuthUser } from "@/types/auth";

const mockInvite = {
  data: {
    qimelaId: "qimela-id-1",
    name: "Liga MX Clausura 2026",
    status: "UPCOMING",
    sport: { id: "sport-1", name: "Fútbol" },
    creator: { name: "Juan García" },
  },
};

const mockUser: AuthUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "USER",
  emailVerifiedAt: null,
};

describe("InvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("shows loading state while getByToken is pending", async () => {
    vi.mocked(inviteApi.getByToken).mockReturnValue(new Promise(() => {}));

    render(<InvitePage />);

    expect(await screen.findByText("Cargando...")).toBeInTheDocument();
  });

  it("shows qimela name, sport name, creator name after successful fetch", async () => {
    vi.mocked(inviteApi.getByToken).mockResolvedValue(mockInvite);

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByText("Liga MX Clausura 2026")).toBeInTheDocument();
    });

    expect(screen.getByText("Fútbol")).toBeInTheDocument();
    expect(screen.getByText("Juan García")).toBeInTheDocument();
  });

  it("shows status badge text 'Próxima' for UPCOMING status", async () => {
    vi.mocked(inviteApi.getByToken).mockResolvedValue(mockInvite);

    render(<InvitePage />);

    await waitFor(() => {
      expect(screen.getByText("Próxima")).toBeInTheDocument();
    });
  });

  it("shows error message on generic API error", async () => {
    vi.mocked(inviteApi.getByToken).mockRejectedValue(new Error("Network error"));

    render(<InvitePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Enlace de invitación no válido."),
      ).toBeInTheDocument();
    });
  });

  it("shows revoked error message on ApiError with status 410", async () => {
    vi.mocked(inviteApi.getByToken).mockRejectedValue(
      new ApiError(410, "Gone"),
    );

    render(<InvitePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Este enlace de invitación ha sido revocado."),
      ).toBeInTheDocument();
    });
  });

  it("shows 'Inicia sesión para suscribirte' button when user is not authenticated", async () => {
    vi.mocked(inviteApi.getByToken).mockResolvedValue(mockInvite);

    render(<InvitePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Inicia sesión para suscribirte" }),
      ).toBeInTheDocument();
    });
  });

  it("shows 'Suscribirse' button when user is authenticated", async () => {
    vi.mocked(inviteApi.getByToken).mockResolvedValue(mockInvite);
    vi.mocked(useAuthContext).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<InvitePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Suscribirse" }),
      ).toBeInTheDocument();
    });
  });

  it("clicking subscribe when not logged in calls router.push with login redirect", async () => {
    vi.mocked(inviteApi.getByToken).mockResolvedValue(mockInvite);

    render(<InvitePage />);

    const button = await screen.findByRole("button", {
      name: "Inicia sesión para suscribirte",
    });
    fireEvent.click(button);

    expect(mockRouterPush).toHaveBeenCalledWith("/login?redirect=/invite/abc123");
  });
});
