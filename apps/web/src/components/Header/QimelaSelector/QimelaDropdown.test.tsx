import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import QimelaDropdown from "./QimelaDropdown";
import type { Qimela } from "@/types/qimela";

const sub1: Qimela = {
  id: "s1",
  name: "Liga MX",
  sportId: "sport-uuid-1",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const sub2: Qimela = {
  id: "s2",
  name: "Premier League",
  sportId: "sport-uuid-1",
  status: "ACTIVE",
  role: "SUBSCRIBER",
  creatorId: "u1",
};

const cre1: Qimela = {
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
    expect(buttons).toHaveLength(3); // sub1, sub2, cre1 (Crear Qimela is a link, not a button)
    // two dividers: one after Crear Qimela, one between sections
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

  it("renders only the Crear Qimela divider when participatingQimelas is empty", () => {
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

  it("renders the Crear Qimela link at the top of the dropdown", () => {
    renderDropdown();
    const link = screen.getByRole("link", { name: "+ Crea tu qimela" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/qimela/create");
  });

  it("calls onClose when the Crear Qimela link is clicked", () => {
    const onClose = vi.fn();
    renderDropdown({ onClose });
    fireEvent.click(screen.getByRole("link", { name: "+ Crea tu qimela" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
