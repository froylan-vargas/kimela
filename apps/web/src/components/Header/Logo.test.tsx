import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Logo from "./Logo";
import { QimelaProvider, useQimelaContext } from "@/context/QimelaContext";
import { AuthProvider } from "@/context/AuthContext";
import type { Qimela } from "@/types/qimela";

vi.mock("@/lib/apiClient", () => ({
  authApi: { me: vi.fn().mockRejectedValue(new Error("no user")), login: vi.fn(), logout: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

// Test component to verify context state changes
function ContextDisplay() {
  const { selectedQimela } = useQimelaContext();
  return <div>{selectedQimela ? `Selected: ${selectedQimela.name}` : "No selection"}</div>;
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QimelaProvider>{children}</QimelaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("Logo", () => {
  it("renders the trophy icon", () => {
    render(<Logo />, { wrapper });
    const icon = screen.getByRole("link").querySelector("i");
    expect(icon).toHaveClass("ph-trophy");
  });

  it("navigates to the default href when clicked", () => {
    render(<Logo />, { wrapper });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });

  it("navigates to custom href when provided", () => {
    render(<Logo href="/dashboard" />, { wrapper });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("clears qimela selection when navigating to dashboard", async () => {
    const qimela: Qimela = {
      id: "q1",
      name: "Test Qimela",
      sportId: "sport-uuid-1",
      status: "ACTIVE",
      role: "CREATOR",
      creatorId: "u1",
    };

    function TestComponent() {
      const { selectQimela } = useQimelaContext();

      return (
        <div>
          <Logo href="/dashboard" />
          <ContextDisplay />
          <button
            type="button"
            onClick={() => selectQimela(qimela, "CREATOR")}
          >
            Select Qimela
          </button>
        </div>
      );
    }

    render(<TestComponent />, { wrapper });

    // Initially no selection
    expect(screen.getByText("No selection")).toBeInTheDocument();

    // Select a qimela
    fireEvent.click(screen.getByText("Select Qimela"));
    await waitFor(() => {
      expect(screen.getByText("Selected: Test Qimela")).toBeInTheDocument();
    });

    // Click the logo to navigate to dashboard
    const link = screen.getByRole("link");
    fireEvent.click(link);

    // Selection should be cleared
    await waitFor(() => {
      expect(screen.getByText("No selection")).toBeInTheDocument();
    });
  });

  it("does not clear qimela selection when navigating to other routes", async () => {
    const qimela: Qimela = {
      id: "q1",
      name: "Test Qimela",
      sportId: "sport-uuid-1",
      status: "ACTIVE",
      role: "CREATOR",
      creatorId: "u1",
    };

    function TestComponent() {
      const { selectQimela } = useQimelaContext();

      return (
        <div>
          <Logo href="/other-route" />
          <ContextDisplay />
          <button
            type="button"
            onClick={() => selectQimela(qimela, "CREATOR")}
          >
            Select Qimela
          </button>
        </div>
      );
    }

    render(<TestComponent />, { wrapper });

    // Select a qimela
    fireEvent.click(screen.getByText("Select Qimela"));
    await waitFor(() => {
      expect(screen.getByText("Selected: Test Qimela")).toBeInTheDocument();
    });

    // Click the logo to navigate to other route
    const link = screen.getByRole("link");
    fireEvent.click(link);

    // Selection should NOT be cleared
    expect(screen.getByText("Selected: Test Qimela")).toBeInTheDocument();
  });
});
