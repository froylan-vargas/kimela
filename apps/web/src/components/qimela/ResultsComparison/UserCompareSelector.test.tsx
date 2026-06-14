import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserCompareSelector from "./UserCompareSelector";

const options = [
  { userId: "1", userName: "Ana Torres", initials: "AT" },
  { userId: "2", userName: "Laura Gómez", initials: "LG" },
  { userId: "3", userName: "Mario Solís", initials: "MS" },
  { userId: "4", userName: "Paola Ruiz", initials: "PR" },
  { userId: "5", userName: "Diego Luna", initials: "DL" },
  { userId: "6", userName: "Sofía Mora", initials: "SM" },
];

describe("UserCompareSelector", () => {
  it("is collapsed by default and expands on toggle", () => {
    render(
      <UserCompareSelector
        options={options}
        selectedUserIds={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByPlaceholderText("Buscar...")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Comparar con otros/ }));
    const searchInput = screen.getByPlaceholderText("Buscar...");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute("type", "search");
    expect(searchInput).toHaveAttribute("name", "qimela-compare-user-search");
    expect(searchInput).toHaveAttribute("autocomplete", "new-password");
    expect(searchInput).toHaveAttribute("data-lpignore", "true");
  });

  it("toggles selection via checkboxes", () => {
    const onChange = vi.fn();
    render(
      <UserCompareSelector
        options={options}
        selectedUserIds={[]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Comparar con otros/ }));
    const checkbox = screen.getByLabelText(/Ana Torres/);
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(["1"]);
  });

  it("disables further checkboxes once max is reached", () => {
    render(
      <UserCompareSelector
        options={options}
        selectedUserIds={["1", "2", "3", "4", "5"]}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Comparar con otros/ }));
    const unselected = screen.getByLabelText(/Sofía Mora/) as HTMLInputElement;
    expect(unselected.disabled).toBe(true);
  });

  it("filters options via the search input", () => {
    render(
      <UserCompareSelector
        options={options}
        selectedUserIds={[]}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Comparar con otros/ }));
    fireEvent.change(screen.getByPlaceholderText("Buscar..."), {
      target: { value: "laura" },
    });
    expect(screen.getByText("Laura Gómez")).toBeInTheDocument();
    expect(screen.queryByText("Ana Torres")).not.toBeInTheDocument();
  });

  it("clears selection and search via Limpiar", () => {
    const onChange = vi.fn();
    render(
      <UserCompareSelector
        options={options}
        selectedUserIds={["1"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("shows selected user pills when collapsed", () => {
    render(
      <UserCompareSelector
        options={options}
        selectedUserIds={["1"]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
  });
});
