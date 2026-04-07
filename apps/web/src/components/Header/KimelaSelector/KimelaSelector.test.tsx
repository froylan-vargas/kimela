import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import KimelaSelector from "./KimelaSelector";
import { KimelaProvider } from "@/context/KimelaContext";
import { useKimelas } from "@/hooks/useKimelas";
import type { Kimela, KimelasResponse } from "@/types/kimela";
import type { UseQueryResult } from "@tanstack/react-query";

vi.mock("@/hooks/useKimelas");

const sub1: Kimela = {
  id: "s1",
  name: "Liga MX",
  description: "Fútbol mexicano",
  sport: "football",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const sub2: Kimela = {
  id: "s2",
  name: "Premier League",
  description: "English football",
  sport: "football",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const cre1: Kimela = {
  id: "c1",
  name: "NBA Pool",
  description: "Basketball",
  sport: "basketball",
  status: "ACTIVE",
  role: "CREATOR",
  creatorId: "u1",
};

const mockResponse: KimelasResponse = {
  data: [sub1, sub2, cre1],
  meta: { total: 3, page: 1, limit: 10 },
};

function mockUseKimelas(
  overrides: Partial<UseQueryResult<KimelasResponse, Error>> = {},
) {
  vi.mocked(useKimelas).mockReturnValue({
    data: mockResponse,
    isLoading: false,
    isError: false,
    isPending: false,
    isSuccess: true,
    error: null,
    ...overrides,
  } as UseQueryResult<KimelasResponse, Error>);
}

function wrapper({ children }: { children: ReactNode }) {
  return <KimelaProvider>{children}</KimelaProvider>;
}

describe("KimelaSelector", () => {
  beforeEach(() => {
    mockUseKimelas();
  });

  it("shows 'Loading...' while fetching", () => {
    mockUseKimelas({ data: undefined, isLoading: true, isPending: true, isSuccess: false });
    render(<KimelaSelector />, { wrapper });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows 'Error loading' on fetch failure", () => {
    mockUseKimelas({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: new Error("500"),
    });
    render(<KimelaSelector />, { wrapper });
    expect(screen.getByText("Error loading")).toBeInTheDocument();
  });

  it("shows 'Select a kimela' when data loaded but nothing selected", () => {
    vi.mocked(useKimelas).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 10 } },
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: true,
      error: null,
    } as UseQueryResult<KimelasResponse, Error>);

    render(<KimelaSelector />, { wrapper });
    expect(screen.getByText("Select a kimela")).toBeInTheDocument();
  });

  it("auto-selects the last SUBSCRIBER kimela after data loads", async () => {
    render(<KimelaSelector />, { wrapper });
    // sub2 is the last SUBSCRIBER in the array
    await waitFor(() => {
      expect(screen.getByText("Premier League")).toBeInTheDocument();
    });
  });

  it("opens the dropdown when the pill button is clicked", async () => {
    render(<KimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /kimela/i });
    fireEvent.click(pill);

    expect(screen.getByText("Participando")).toBeInTheDocument();
    expect(screen.getByText("Creadas")).toBeInTheDocument();
  });

  it("closes the dropdown when the pill is clicked again", async () => {
    render(<KimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /kimela/i });
    fireEvent.click(pill);
    expect(screen.getByText("Participando")).toBeInTheDocument();

    fireEvent.click(pill);
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("closes the dropdown on Escape key", () => {
    render(<KimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /kimela/i });
    fireEvent.click(pill);
    expect(screen.getByText("Participando")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("closes the dropdown on outside click", () => {
    render(
      <div>
        <KimelaSelector />
        <button type="button">Outside</button>
      </div>,
      { wrapper },
    );

    const pill = screen.getByRole("button", { name: /kimela/i });
    fireEvent.click(pill);
    expect(screen.getByText("Participando")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText("Outside"));
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("updates context and closes dropdown when a kimela is selected", async () => {
    render(<KimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /kimela/i });
    fireEvent.click(pill);

    // Liga MX only appears once — in the Participando section
    fireEvent.click(screen.getByText("Liga MX"));

    // dropdown closed
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
    // pill now shows the selected kimela name
    await waitFor(() => {
      expect(screen.getByText("Liga MX")).toBeInTheDocument();
    });
  });

  it("pill button has aria-expanded=false when closed and true when open", () => {
    render(<KimelaSelector />, { wrapper });

    const pill = screen.getByRole("button", { name: /kimela/i });
    expect(pill).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(pill);
    expect(pill).toHaveAttribute("aria-expanded", "true");
  });
});
