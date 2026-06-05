import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRouterPush,
  mockSelectQimela,
  mockClearQimela,
  mockInvalidateQueries,
  mockFetchQuery,
  mockFetchQimelas,
} = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockSelectQimela: vi.fn(),
  mockClearQimela: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockFetchQuery: vi.fn(),
  mockFetchQimelas: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "qimela-uuid" }),
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      fetchQuery: mockFetchQuery,
    }),
  };
});

vi.mock("@/components/qimela/SubscribersList/SubscribersList", () => ({
  default: () => null,
}));

vi.mock("@/lib/apiClient", () => ({
  qimelasApi: {
    getById: vi.fn(),
    update: vi.fn(),
    subscribe: vi.fn(),
  },
  inviteApi: {
    generate: vi.fn(),
    revoke: vi.fn(),
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

vi.mock("@/context/QimelaContext", () => ({
  useQimelaContext: () => ({
    selectQimela: mockSelectQimela,
    clearQimela: mockClearQimela,
  }),
}));

vi.mock("@/hooks/useQimelas", () => ({
  qimelasQueryKey: ["qimelas"],
  fetchQimelas: mockFetchQimelas,
}));

const mockToast = vi.fn();
vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("./page.module.scss", () => ({ default: {} }));

import { qimelasApi, inviteApi, ApiError } from "@/lib/apiClient";
import { useAuthContext } from "@/context/AuthContext";
import QimelaDetailPage from "./page";
import type { AuthUser } from "@/types/auth";

const CREATOR_ID = "creator-id-1";
const QIMELA_ID = "qimela-uuid";

const mockQimela = {
  data: {
    id: QIMELA_ID,
    name: "Mi Quiniela",
    status: "UPCOMING",
    sportId: "sport-1",
    creatorId: CREATOR_ID,
    eventId: null,
    startPhaseId: null,
    endPhaseId: null,
    isSubscribed: false,
    phases: [],
    rules: [],
  },
};

const creatorUser: AuthUser = {
  id: CREATOR_ID,
  name: "Creator User",
  email: "creator@example.com",
  role: "USER",
  emailVerifiedAt: null,
      imageUrl: null,
};

const otherUser: AuthUser = {
  id: "other-user-id",
  name: "Other User",
  email: "other@example.com",
  role: "USER",
  emailVerifiedAt: null,
      imageUrl: null,
};

describe("QimelaDetailPage — Share section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(qimelasApi.getById).mockResolvedValue(mockQimela);
    vi.mocked(qimelasApi.subscribe).mockResolvedValue({
      data: { subscriptionId: "subscription-1" },
    });
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockFetchQuery.mockResolvedValue({
      data: [
        {
          id: QIMELA_ID,
          name: "Mi Quiniela",
          sportId: "sport-1",
          status: "UPCOMING",
          role: "SUBSCRIBER",
          creatorId: CREATOR_ID,
        },
      ],
      meta: { total: 1, page: 1, limit: 10 },
    });
    vi.mocked(useAuthContext).mockReturnValue({
      user: creatorUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it("Share section is NOT visible when user is not the creator", async () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: otherUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<QimelaDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Mi Quiniela")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Enlace de invitación"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copiar enlace" }),
    ).not.toBeInTheDocument();
  });

  it("Share section IS visible when user is the creator", async () => {
    render(<QimelaDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Enlace de invitación")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Copiar enlace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revocar enlace" }),
    ).toBeInTheDocument();
  });

  it("clicking 'Copiar enlace' calls inviteApi.generate with the qimela id", async () => {
    vi.mocked(inviteApi.generate).mockResolvedValue({
      data: { token: "invite-token-xyz" },
    });

    render(<QimelaDetailPage />);

    const copyButton = await screen.findByRole("button", { name: "Copiar enlace" });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(inviteApi.generate).toHaveBeenCalledWith(QIMELA_ID);
    });
  });

  it("after successful generate, copies URL to clipboard and toasts success", async () => {
    vi.mocked(inviteApi.generate).mockResolvedValue({
      data: { token: "invite-token-xyz" },
    });

    render(<QimelaDetailPage />);

    const copyButton = await screen.findByRole("button", { name: "Copiar enlace" });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/invite/invite-token-xyz"),
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.any(String),
      "success",
    );
  });

  it("after generate error, toasts an error", async () => {
    vi.mocked(inviteApi.generate).mockRejectedValue(new Error("Server error"));

    render(<QimelaDetailPage />);

    const copyButton = await screen.findByRole("button", { name: "Copiar enlace" });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), "error");
    });
  });

  it("clicking 'Revocar enlace' calls inviteApi.revoke with the qimela id", async () => {
    vi.mocked(inviteApi.revoke).mockResolvedValue(undefined);

    render(<QimelaDetailPage />);

    const revokeButton = await screen.findByRole("button", { name: "Revocar enlace" });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(inviteApi.revoke).toHaveBeenCalledWith(QIMELA_ID);
    });
  });

  it("after revoke 404 error, toasts an error", async () => {
    vi.mocked(inviteApi.revoke).mockRejectedValue(new ApiError(404, "Not Found"));

    render(<QimelaDetailPage />);

    const revokeButton = await screen.findByRole("button", { name: "Revocar enlace" });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.any(String), "error");
    });
  });

  it("subscribes, selects the qimela, and redirects to dashboard", async () => {
    render(<QimelaDetailPage />);

    const subscribeButton = await screen.findByRole("button", {
      name: "Suscribirme",
    });
    fireEvent.click(subscribeButton);

    await waitFor(() => {
      expect(qimelasApi.subscribe).toHaveBeenCalledWith(QIMELA_ID);
      expect(mockSelectQimela).toHaveBeenCalledWith(
        expect.objectContaining({ id: QIMELA_ID }),
        "SUBSCRIBER",
      );
      expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
