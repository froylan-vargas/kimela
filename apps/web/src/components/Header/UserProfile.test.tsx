import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserProfile from "./UserProfile";
import { useAuth } from "@/hooks/useAuth";

const push = vi.fn();
const logout = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("UserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout,
      updateUser: vi.fn(),
    });
  });

  it("opens the account menu and shows 'Cerrar sesión'", () => {
    render(<UserProfile name="Froy Landcito" />);

    fireEvent.click(screen.getByRole("button", { name: "Cuenta de Froy Landcito" }));

    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("logs out from the account menu", async () => {
    logout.mockResolvedValue(undefined);
    render(<UserProfile name="Froy Landcito" />);

    fireEvent.click(screen.getByRole("button", { name: "Cuenta de Froy Landcito" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/login");
    });
  });
});
