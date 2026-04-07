import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleGuard } from "./RoleGuard";
import type { AuthUser } from "@/types/auth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

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

describe("RoleGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when user has the allowed role", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <RoleGuard allowed="USER">
        <span>Protected Content</span>
      </RoleGuard>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders fallback when user does not have the allowed role", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <RoleGuard allowed="ADMIN" fallback={<span>Access Denied</span>}>
        <span>Protected Content</span>
      </RoleGuard>,
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("renders fallback when user is null (not authenticated)", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <RoleGuard allowed="USER" fallback={<span>Please Login</span>}>
        <span>Protected Content</span>
      </RoleGuard>,
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Please Login")).toBeInTheDocument();
  });

  it("renders children when role is in an array of allowed roles", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: adminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <RoleGuard allowed={["USER", "ADMIN"]}>
        <span>Multi-Role Content</span>
      </RoleGuard>,
    );

    expect(screen.getByText("Multi-Role Content")).toBeInTheDocument();
  });

  it("renders fallback when role is not in array of allowed roles", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <RoleGuard allowed={["ADMIN"]} fallback={<span>Not Allowed</span>}>
        <span>Admin Only Content</span>
      </RoleGuard>,
    );

    expect(screen.queryByText("Admin Only Content")).not.toBeInTheDocument();
    expect(screen.getByText("Not Allowed")).toBeInTheDocument();
  });

  it("renders null (default fallback) when no fallback prop and user unauthorized", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(
      <RoleGuard allowed="ADMIN">
        <span>Admin Content</span>
      </RoleGuard>,
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
