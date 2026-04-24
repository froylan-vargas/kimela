import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PhaseFilter from "./PhaseFilter";

const phases = [
  { id: "phase-1", name: "Jornada 1", order: 1, status: "COMPLETED" as const },
  { id: "phase-2", name: "Jornada 2", order: 2, status: "ACTIVE" as const },
];

describe("PhaseFilter", () => {
  it("shows the placeholder option selected by default", () => {
    render(
      <PhaseFilter phases={phases} selectedPhaseId={null} onChange={() => {}} />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("renders each phase as an option", () => {
    render(
      <PhaseFilter phases={phases} selectedPhaseId={null} onChange={() => {}} />,
    );
    expect(screen.getByText(/Jornada 1/)).toBeInTheDocument();
    expect(screen.getByText(/Jornada 2/)).toBeInTheDocument();
  });

  it("marks the current active phase with '(en curso)'", () => {
    render(
      <PhaseFilter phases={phases} selectedPhaseId={null} onChange={() => {}} />,
    );
    expect(screen.getByText(/Jornada 2.*en curso/)).toBeInTheDocument();
  });

  it("invokes onChange with the selected phase id", () => {
    const onChange = vi.fn();
    render(
      <PhaseFilter phases={phases} selectedPhaseId={null} onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "phase-1" } });
    expect(onChange).toHaveBeenCalledWith("phase-1");
  });

  it("invokes onChange with null when clearing selection", () => {
    const onChange = vi.fn();
    render(
      <PhaseFilter
        phases={phases}
        selectedPhaseId="phase-1"
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
