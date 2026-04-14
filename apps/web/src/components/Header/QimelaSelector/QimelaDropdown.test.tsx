import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
    // divider is a div with the divider class — check it exists between sections
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3); // sub1, sub2, cre1
    // divider element exists in DOM
    expect(container.querySelector('[class*="divider"]')).toBeInTheDocument();
  });

  it("does not render Creadas section when creatorQimelas is empty", () => {
    renderDropdown({ creatorQimelas: [] });
    expect(screen.queryByText("Creadas")).not.toBeInTheDocument();
  });

  it("does not render Participando section when participatingQimelas is empty", () => {
    renderDropdown({ participatingQimelas: [] });
    expect(screen.queryByText("Participando")).not.toBeInTheDocument();
  });

  it("does not render a divider when only one section is present", () => {
    const { container } = renderDropdown({ creatorQimelas: [] });
    expect(container.querySelector('[class*="divider"]')).not.toBeInTheDocument();
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
});
