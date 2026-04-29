import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import QimelaSelector from "./QimelaSelector";
import { QimelaProvider } from "@/context/QimelaContext";
import { AuthProvider } from "@/context/AuthContext";
import { useQimelas } from "@/hooks/useQimelas";
import type { qimela, QimelasResponse } from "@/types/qimela";
import type { UseQueryResult } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useQimelas");
vi.mock("@/lib/apiClient", () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error("no user")),
    login: vi.fn(),
    logout: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const sub1: qimela = {
  id: "s1",
  name: "Liga MX",
  sportId: "sport-uuid-1",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const sub2: qimela = {
  id: "s2",
  name: "Premier League",
  sportId: "sport-uuid-1",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const cre1: qimela = {
  id: "c1",
  name: "NBA Pool",
  sportId: "sport-uuid-2",
  status: "ACTIVE",
  role: "CREATOR",
  creatorId: "u1",
};

const mockResponse: QimelasResponse = {
  data: [sub1, sub2, cre1],
  meta: { total: 3, page: 1, limit: 10 },
};

function mockUseQimelas(
  overrides: Partial<UseQueryResult<QimelasResponse, Error>> = {},
) {
  vi.mocked(useQimelas).mockReturnValue({
    data: mockResponse,
    isLoading: false,
    isError: false,
    isPending: false,
    isSuccess: true,
    error: null,
    ...overrides,
  } as UseQueryResult<QimelasResponse, Error>);
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QimelaProvider>{children}</QimelaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("QimelaSelector", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    mockUseQimelas();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("shows 'Cargando...' while fetching", () => {
    mockUseQimelas({
      data: undefined,
      isLoading: true,
      isPending: true,
      isSuccess: false,
    });
    render(<QimelaSelector />, { wrapper });
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("shows 'Error al cargar' on fetch failure", () => {
    mockUseQimelas({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: new Error("500"),
    });
    render(<QimelaSelector />, { wrapper });
    expect(screen.getByText("Error al cargar")).toBeInTheDocument();
  });

  it("shows 'Selecciona una qimela' when data loaded but nothing selected", () => {
    mockUseQimelas({
      data: { data: [], meta: { total: 0, page: 1, limit: 10 } },
    });

    render(<QimelaSelector />, { wrapper });
    expect(screen.getByText("Selecciona una qimela")).toBeInTheDocument();
  });

  it("does not auto-select a qimela after data loads", () => {
    render(<QimelaSelector />, { wrapper });
    expect(screen.getByText("Selecciona una qimela")).toBeInTheDocument();
    expect(screen.queryByText("Premier League")).not.toBeInTheDocument();
  });

  it("opens the dropdown when the pill button is clicked", async () => {
    render(<QimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /qimela/i });
    fireEvent.click(pill);

    expect(screen.getByText("Participando")).toBeInTheDocument();
    expect(screen.getByText("Creadas")).toBeInTheDocument();
  });

  it("closes the dropdown when the pill is clicked again", async () => {
    render(<QimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /qimela/i });
    fireEvent.click(pill);
    expect(screen.getByText("Participando")).toBeInTheDocument();

    fireEvent.click(pill);
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("closes the dropdown on Escape key", () => {
    render(<QimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /qimela/i });
    fireEvent.click(pill);
    expect(screen.getByText("Participando")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("closes the dropdown on outside click", () => {
    render(
      <div>
        <QimelaSelector />
        <button type="button">Outside</button>
      </div>,
      { wrapper },
    );

    const pill = screen.getByRole("button", { name: /qimela/i });
    fireEvent.click(pill);
    expect(screen.getByText("Participando")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText("Outside"));
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("updates context and closes dropdown when a qimela is selected", async () => {
    render(<QimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /qimela/i });
    fireEvent.click(pill);

    // Liga MX only appears once — in the Participando section
    fireEvent.click(screen.getByText("Liga MX"));

    // dropdown closed
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
    // pill now shows the selected qimela name
    await waitFor(() => {
      expect(screen.getByText("Liga MX")).toBeInTheDocument();
    });
  });

  it("pill button has aria-expanded=false when closed and true when open", () => {
    render(<QimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /qimela/i });
    expect(pill).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(pill);
    expect(pill).toHaveAttribute("aria-expanded", "true");
  });
});
