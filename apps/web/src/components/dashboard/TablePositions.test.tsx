import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TablePositions from "./TablePositions";

describe("TablePositions", () => {
  it("renders the standings card with mock rows", () => {
    render(<TablePositions qimelaName="Champions League 2026" />);

    expect(
      screen.getByRole("heading", { name: "Posiciones" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ana Torres")).toHaveLength(3);
    expect(screen.getByText(/3\.\s*Froylan Vargas/)).toBeInTheDocument();
    expect(screen.getAllByText("Froylan Vargas")).toHaveLength(2);
    expect(screen.getAllByText("Tú")).toHaveLength(2);
    expect(screen.getByText(/Champions League 2026/)).toBeInTheDocument();
  });
});
