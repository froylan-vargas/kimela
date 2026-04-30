import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockPush = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  mockPush = vi.fn();
  mockPathname = "/";
});

import QimelaDropdown from "./QimelaDropdown";
import type { qimela } from "@/types/qimela";

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

function renderDropdown(overrides = {}) {
  const defaults = {
    participatingQimelas: [sub1, sub2],
    creatorQimelas: [cre1],
    selectedId: null,
    selectedViewAs: null,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };
  return render(<QimelaDropdown {...defaults} {...overrides} />);
}

describe("QimelaDropdown", () => {
  it("renders the Participando section with subscriber qimelas", () => {
    renderDropdown();
    expect(screen.getByText("Participando")).toBeInTheDocument();
    expect(screen.getByText("Liga MX")).toBeInTheDocument();
    expect(screen.getByText("Premier League")).toBeInTheDocument();
  });

  it("renders the Creadas section with creator qimelas", () => {
    renderDropdown();
    expect(screen.getByText("Creadas")).toBeInTheDocument();
    expect(screen.getByText("NBA Pool")).toBeInTheDocument();
  });

  it("renders a divider when both sections are present", () => {
    const { container } = renderDropdown();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3); // sub1, sub2, cre1 (Crear qimela is a link, not a button)
    // two dividers: one after Crear qimela, one between sections
    expect(container.querySelectorAll('[class*="divider"]')).toHaveLength(2);
  });

  it("always renders the Creadas section title", () => {
    renderDropdown({ creatorQimelas: [] });
    expect(screen.getByText("Creadas")).toBeInTheDocument();
  });

  it("shows empty message when creatorQimelas is empty", () => {
    renderDropdown({ creatorQimelas: [] });
    expect(screen.getByText("No has creado qimelas")).toBeInTheDocument();
  });

  it("does not render Participando section when participatingQimelas is empty", () => {
    renderDropdown({ participatingQimelas: [] });
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("renders only the Crear qimela divider when participatingQimelas is empty", () => {
    const { container } = renderDropdown({ participatingQimelas: [] });
    expect(container.querySelectorAll('[class*="divider"]')).toHaveLength(1);
  });

  it("calls onSelect and onClose when a subscriber item is clicked", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderDropdown({ onSelect, onClose });

    fireEvent.click(screen.getByText("Liga MX"));

    expect(onSelect).toHaveBeenCalledWith(sub1, "SUBSCRIBER");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect and onClose when a creator item is clicked", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderDropdown({ onSelect, onClose });

    fireEvent.click(screen.getByText("NBA Pool"));

    expect(onSelect).toHaveBeenCalledWith(cre1, "CREATOR");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("applies selected class to the matching subscriber item", () => {
    renderDropdown({ selectedId: "s1", selectedViewAs: "SUBSCRIBER" });

    const ligaMXButton = screen.getByText("Liga MX").closest("button")!;
    expect(ligaMXButton.className).toMatch(/selected/);

    const premierButton = screen.getByText("Premier League").closest("button")!;
    expect(premierButton.className).not.toMatch(/selected/);
  });

  it("applies selected class to the matching creator item", () => {
    renderDropdown({ selectedId: "c1", selectedViewAs: "CREATOR" });

    const nbaButton = screen.getByText("NBA Pool").closest("button")!;
    expect(nbaButton.className).toMatch(/selected/);
  });

  it("does not apply selected to a subscriber item when viewAs is CREATOR", () => {
    renderDropdown({ selectedId: "s1", selectedViewAs: "CREATOR" });

    const ligaMXButton = screen.getByText("Liga MX").closest("button")!;
    expect(ligaMXButton.className).not.toMatch(/selected/);
  });

  it("renders the Crear qimela link at the top of the dropdown", () => {
    renderDropdown();
    const link = screen.getByRole("link", { name: "+ Crea tu qimela" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/qimela/create");
  });

  it("calls onClose when the Crear qimela link is clicked", () => {
    const onClose = vi.fn();
    renderDropdown({ onClose });
    fireEvent.click(screen.getByRole("link", { name: "+ Crea tu qimela" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("preserves the /results sub-route when switching qimela from a results page", () => {
    mockPathname = "/qimela/s1/results";
    renderDropdown();

    fireEvent.click(screen.getByText("Premier League"));

    expect(mockPush).toHaveBeenCalledWith(`/qimela/${sub2.id}/results`);
  });

  it("preserves the /sessions sub-route when switching qimela from a sessions page", () => {
    mockPathname = "/qimela/s1/sessions";
    renderDropdown();

    fireEvent.click(screen.getByText("Premier League"));

    expect(mockPush).toHaveBeenCalledWith(`/qimela/${sub2.id}/sessions`);
  });

  it("navigates to /dashboard for a subscriber item when not on a sub-route", () => {
    mockPathname = "/qimela/s1";
    renderDropdown();

    fireEvent.click(screen.getByText("Liga MX"));

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("navigates to /qimela/:id for a creator item when not on a sub-route", () => {
    mockPathname = "/dashboard";
    renderDropdown();

    fireEvent.click(screen.getByText("NBA Pool"));

    expect(mockPush).toHaveBeenCalledWith(`/qimela/${cre1.id}`);
  });
});
