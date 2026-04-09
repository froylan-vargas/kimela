import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import QimelaSelector from "./QimelaSelector";
import { QimelaProvider } from "@/context/QimelaContext";
import { useQimelas } from "@/hooks/useQimelas";
import type { Qimela, QimelasResponse } from "@/types/qimela";
import type { UseQueryResult } from "@tanstack/react-query";

vi.mock("@/hooks/useQimelas");

const sub1: Qimela = {
  id: "s1",
  name: "Liga MX",
  description: "Fútbol mexicano",
  sport: "football",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const sub2: Qimela = {
  id: "s2",
  name: "Premier League",
  description: "English football",
  sport: "football",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const cre1: Qimela = {
  id: "c1",
  name: "NBA Pool",
  description: "Basketball",
  sport: "basketball",
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

function wrapper({ children }: { children: ReactNode }) {
  return <QimelaProvider>{children}</QimelaProvider>;
}

describe("QimelaSelector", () => {
  beforeEach(() => {
    mockUseQimelas();
  });

  it("shows 'Loading...' while fetching", () => {
    mockUseQimelas({ data: undefined, isLoading: true, isPending: true, isSuccess: false });
    render(<QimelaSelector />, { wrapper });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows 'Error loading' on fetch failure", () => {
    mockUseQimelas({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: new Error("500"),
    });
    render(<QimelaSelector />, { wrapper });
    expect(screen.getByText("Error loading")).toBeInTheDocument();
  });

  it("shows 'Select a qimela' when data loaded but nothing selected", () => {
    vi.mocked(useQimelas).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 10 } },
      isLoading: false,
      isError: false,
      isPending: false,
      isSuccess: true,
      error: null,
    } as UseQueryResult<QimelasResponse, Error>);

    render(<QimelaSelector />, { wrapper });
    expect(screen.getByText("Select a qimela")).toBeInTheDocument();
  });

  it("auto-selects the last SUBSCRIBER qimela after data loads", async () => {
    render(<QimelaSelector />, { wrapper });
    // sub2 is the last SUBSCRIBER in the array
    await waitFor(() => {
      expect(screen.getByText("Premier League")).toBeInTheDocument();
    });
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
