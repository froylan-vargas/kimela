import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SessionUpload from "./SessionUpload";

describe("SessionUpload", () => {
  it("renders a drag-and-drop zone", () => {
    render(<SessionUpload onUpload={vi.fn()} isUploading={false} />);

    expect(
      screen.getByRole("region", { name: "Zona de carga de archivo CSV" }),
    ).toBeInTheDocument();
  });

  it("renders an 'Elegir archivo' button when not uploading", () => {
    render(<SessionUpload onUpload={vi.fn()} isUploading={false} />);

    expect(
      screen.getByRole("button", { name: "Elegir archivo" }),
    ).toBeInTheDocument();
  });

  it("does not show CSV format hints or column names in the UI", () => {
    render(<SessionUpload onUpload={vi.fn()} isUploading={false} />);

    expect(screen.queryByText(/columna/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/formato/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/header/i)).not.toBeInTheDocument();
  });

  it("calls onUpload with the selected file when a file is chosen via the file input", async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    render(<SessionUpload onUpload={onUpload} isUploading={false} />);

    const file = new File(["home,away,date"], "sessions.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledOnce();
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it("shows loading state and hides Elegir archivo button when isUploading is true", () => {
    render(<SessionUpload onUpload={vi.fn()} isUploading={true} />);

    expect(screen.getByText("Cargando archivo...")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Elegir archivo" }),
    ).not.toBeInTheDocument();
  });

  it("displays error message when onUpload rejects", async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error("Bad format"));
    render(<SessionUpload onUpload={onUpload} isUploading={false} />);

    const file = new File(["bad data"], "bad.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent("El archivo no tiene el formato correcto.");
    });
  });
});
