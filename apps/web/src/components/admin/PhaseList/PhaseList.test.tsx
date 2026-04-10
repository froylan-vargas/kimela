import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PhaseList from "./PhaseList";
import type { Phase } from "@/types/phase";

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: vi.fn(() => "") } },
}));

const makePhase = (overrides: Partial<Phase> = {}): Phase => ({
  id: "phase-1",
  name: "Jornada 1",
  order: 1,
  type: "REGULAR_SEASON",
  eventId: "event-1",
  ...overrides,
});

const defaultProps = {
  phases: [] as Phase[],
  selectedPhaseId: undefined,
  onSelect: vi.fn(),
  onReorder: vi.fn(),
  onDelete: vi.fn(),
};

describe("PhaseList", () => {
  it("renders empty state when phases array is empty", () => {
    render(<PhaseList {...defaultProps} phases={[]} />);

    expect(screen.getByText(/No hay fases/)).toBeInTheDocument();
  });

  it("renders a list item for each phase with order and name", () => {
    const phases = [
      makePhase({ id: "p1", order: 1, name: "Jornada 1" }),
      makePhase({ id: "p2", order: 2, name: "Jornada 2" }),
    ];

    render(<PhaseList {...defaultProps} phases={phases} />);

    expect(screen.getByText("Jornada 1")).toBeInTheDocument();
    expect(screen.getByText("Jornada 2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders the correct phase type badge label", () => {
    const phases = [
      makePhase({ id: "p1", type: "REGULAR_SEASON", name: "Fase Regular" }),
      makePhase({ id: "p2", type: "PLAYOFFS", name: "Fase Eliminatoria" }),
      makePhase({ id: "p3", type: "OTHER", name: "Fase Extra" }),
    ];

    render(<PhaseList {...defaultProps} phases={phases} />);

    expect(screen.getByText("Temporada Regular")).toBeInTheDocument();
    expect(screen.getByText("Playoffs")).toBeInTheDocument();
    expect(screen.getByText("Otro")).toBeInTheDocument();
  });

  it("calls onSelect with the phase when a phase item is clicked", () => {
    const onSelect = vi.fn();
    const phase = makePhase({ id: "p1", name: "Jornada 1" });

    render(<PhaseList {...defaultProps} phases={[phase]} onSelect={onSelect} />);

    // The item body button carries aria-pressed; the drag handle does not
    fireEvent.click(screen.getByRole("button", { pressed: false }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(phase);
  });

  it("marks the selected phase with aria-pressed true and others false", () => {
    const phases = [
      makePhase({ id: "p1", name: "Jornada 1" }),
      makePhase({ id: "p2", name: "Jornada 2" }),
    ];

    render(<PhaseList {...defaultProps} phases={phases} selectedPhaseId="p1" />);

    // getAllByRole with pressed:true returns only item-body buttons (which carry aria-pressed)
    const selectedButtons = screen.getAllByRole("button", { pressed: true });
    expect(selectedButtons).toHaveLength(1);
    expect(selectedButtons[0]).toHaveTextContent("Jornada 1");

    const unselectedButtons = screen.getAllByRole("button", { pressed: false });
    expect(unselectedButtons).toHaveLength(1);
    expect(unselectedButtons[0]).toHaveTextContent("Jornada 2");
  });

  it("calls onDelete with the phase id when delete button is clicked", () => {
    const onDelete = vi.fn();
    const phase = makePhase({ id: "p1", name: "Jornada 1" });

    render(<PhaseList {...defaultProps} phases={[phase]} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar fase Jornada 1" }));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith("p1");
  });

  it("renders a drag handle button for each phase", () => {
    const phases = [
      makePhase({ id: "p1", name: "Jornada 1" }),
      makePhase({ id: "p2", name: "Jornada 2" }),
    ];

    render(<PhaseList {...defaultProps} phases={phases} />);

    const dragHandles = screen.getAllByRole("button", {
      name: "Arrastrar para reordenar",
    });
    expect(dragHandles).toHaveLength(2);
  });
});
