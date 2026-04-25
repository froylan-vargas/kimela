import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SubscribersList from "./SubscribersList";

const mockToast = vi.fn();

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/apiClient", () => ({
  qimelasApi: {
    getSubscribers: vi.fn(),
    removeSubscriber: vi.fn(),
    getLabels: vi.fn(),
    createLabel: vi.fn(),
    deleteLabel: vi.fn(),
    applyLabel: vi.fn(),
    removeLabel: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => ({
  toUserMessage: (err: unknown) => (err instanceof Error ? err.message : "Error"),
}));

import { qimelasApi } from "@/lib/apiClient";

const mockGetSubscribers = qimelasApi.getSubscribers as ReturnType<typeof vi.fn>;
const mockRemoveSubscriber = qimelasApi.removeSubscriber as ReturnType<typeof vi.fn>;
const mockGetLabels = qimelasApi.getLabels as ReturnType<typeof vi.fn>;
const mockCreateLabel = qimelasApi.createLabel as ReturnType<typeof vi.fn>;
const mockDeleteLabel = qimelasApi.deleteLabel as ReturnType<typeof vi.fn>;
const mockApplyLabel = qimelasApi.applyLabel as ReturnType<typeof vi.fn>;
const mockRemoveLabel = qimelasApi.removeLabel as ReturnType<typeof vi.fn>;

const makeResponse = (
  subscribers: { userId: string; name: string; email: string; labels?: { id: string; name: string; color: string }[] }[],
  total?: number,
) => ({
  data: {
    subscribers: subscribers.map((s) => ({ ...s, labels: s.labels ?? [] })),
    total: total ?? subscribers.length,
    page: 1,
    limit: 10,
  },
});

const makeLabelsResponse = (labels: { id: string; name: string; color: string }[]) => ({
  data: { labels },
});

const SUBSCRIBERS = [
  { userId: "u1", name: "Ana Torres", email: "ana@example.com" },
  { userId: "u2", name: "Luis Ramos", email: "luis@example.com" },
];

const LABELS = [
  { id: "l1", name: "VIP", color: "#ff0000" },
  { id: "l2", name: "Casual", color: "#3b82f6" },
];

describe("SubscribersList", () => {
  beforeEach(() => {
    mockGetSubscribers.mockReset();
    mockRemoveSubscriber.mockReset();
    mockGetLabels.mockReset();
    mockCreateLabel.mockReset();
    mockDeleteLabel.mockReset();
    mockApplyLabel.mockReset();
    mockRemoveLabel.mockReset();
    mockToast.mockReset();

    mockGetLabels.mockResolvedValue(makeLabelsResponse([]));
  });

  // ─── existing subscriber list behaviour ──────────────────────────────────

  it("shows empty state when there are no subscribers", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() =>
      expect(screen.getByText("Aún no hay participantes.")).toBeInTheDocument(),
    );
  });

  it("renders name and email for each subscriber", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByText("Ana Torres")).toBeInTheDocument());
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Luis Ramos")).toBeInTheDocument();
    expect(screen.getByText("luis@example.com")).toBeInTheDocument();
  });

  it("renders a remove button for each subscriber", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByLabelText("Eliminar a Ana Torres")).toBeInTheDocument());
    expect(screen.getByLabelText("Eliminar a Luis Ramos")).toBeInTheDocument();
  });

  it("calls removeSubscriber and shows a success toast when remove is clicked", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS));
    mockRemoveSubscriber.mockResolvedValue({ data: { removed: true } });
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByLabelText("Eliminar a Ana Torres")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Eliminar a Ana Torres"));

    await waitFor(() =>
      expect(mockRemoveSubscriber).toHaveBeenCalledWith("q1", "u1"),
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Suscriptor eliminado.", "success"),
    );
  });

  it("shows an error toast when removeSubscriber fails", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS));
    mockRemoveSubscriber.mockRejectedValue(new Error("Server error"));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByLabelText("Eliminar a Ana Torres")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Eliminar a Ana Torres"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Server error", "error"),
    );
  });

  it("renders the search input", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    render(<SubscribersList qimelaId="q1" />);
    expect(screen.getByPlaceholderText("Buscar por nombre o correo")).toBeInTheDocument();
    await waitFor(() => expect(mockGetSubscribers).toHaveBeenCalled());
  });

  it("shows pagination controls when total exceeds one page", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS, 25));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByText("Anterior")).toBeInTheDocument());
    expect(screen.getByText("Siguiente")).toBeInTheDocument();
  });

  it("disables the Anterior button on the first page", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS, 25));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByText("Anterior")).toBeInTheDocument());
    expect(screen.getByText("Anterior")).toBeDisabled();
  });

  it("does not render pagination when all results fit on one page", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS, 2));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByText("Ana Torres")).toBeInTheDocument());
    expect(screen.queryByText("Anterior")).not.toBeInTheDocument();
  });

  it("shows 'Sin resultados.' empty state when search yields no matches", async () => {
    mockGetSubscribers
      .mockResolvedValueOnce(makeResponse(SUBSCRIBERS))
      .mockResolvedValue(makeResponse([]));

    vi.useFakeTimers({ shouldAdvanceTime: false });
    render(<SubscribersList qimelaId="q1" />);

    await act(async () => { await vi.runAllTimersAsync(); });
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o correo"), {
      target: { value: "zzz" },
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    vi.useRealTimers();

    expect(screen.getByText("Sin resultados.")).toBeInTheDocument();
  });

  // ─── isCreator=false (default) ───────────────────────────────────────────

  it("does not call getLabels when isCreator is false", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(mockGetSubscribers).toHaveBeenCalled());
    expect(mockGetLabels).not.toHaveBeenCalled();
  });

  it("does not render the Etiquetas toggle when isCreator is false", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByText("Ana Torres")).toBeInTheDocument());
    expect(screen.queryByText(/Etiquetas/)).not.toBeInTheDocument();
  });

  it("does not render assign-label buttons for subscribers when isCreator is false", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse(SUBSCRIBERS));
    render(<SubscribersList qimelaId="q1" />);
    await waitFor(() => expect(screen.getByText("Ana Torres")).toBeInTheDocument());
    expect(screen.queryByLabelText("Etiquetar a Ana Torres")).not.toBeInTheDocument();
  });

  // ─── isCreator=true – label panel ────────────────────────────────────────

  it("calls getLabels when isCreator is true", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => expect(mockGetLabels).toHaveBeenCalledWith("q1"));
  });

  it("renders the Etiquetas toggle button when isCreator is true", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() =>
      expect(screen.getByText(/Etiquetas \(0\/3\)/)).toBeInTheDocument(),
    );
  });

  it("shows empty-labels message when panel is opened and no labels exist", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse([]));
    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas/));

    fireEvent.click(screen.getByText(/Etiquetas/));

    expect(screen.getByText("Sin etiquetas. Crea hasta 3.")).toBeInTheDocument();
  });

  it("shows existing labels in the panel after opening", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse(LABELS));
    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas \(2\/3\)/));

    fireEvent.click(screen.getByText(/Etiquetas \(2\/3\)/));

    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Casual")).toBeInTheDocument();
  });

  it("renders delete buttons for each label in the panel", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse(LABELS));
    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas \(2\/3\)/));

    fireEvent.click(screen.getByText(/Etiquetas \(2\/3\)/));

    expect(screen.getByLabelText("Eliminar etiqueta VIP")).toBeInTheDocument();
    expect(screen.getByLabelText("Eliminar etiqueta Casual")).toBeInTheDocument();
  });

  // ─── create label ─────────────────────────────────────────────────────────

  it("creates a label and adds it to the panel", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse([]));
    mockCreateLabel.mockResolvedValue({ data: { id: "l-new", name: "Nuevo", color: "#22c55e" } });

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas/));
    fireEvent.click(screen.getByText(/Etiquetas/));

    fireEvent.change(screen.getByPlaceholderText("Nombre de etiqueta"), {
      target: { value: "Nuevo" },
    });
    fireEvent.click(screen.getByText("Crear"));

    await waitFor(() =>
      expect(mockCreateLabel).toHaveBeenCalledWith("q1", {
        name: "Nuevo",
        color: expect.any(String),
      }),
    );
    await waitFor(() => expect(screen.getByText("Nuevo")).toBeInTheDocument());
  });

  it("shows an error toast when createLabel fails", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse([]));
    mockCreateLabel.mockRejectedValue(new Error("Create failed"));

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas/));
    fireEvent.click(screen.getByText(/Etiquetas/));

    fireEvent.change(screen.getByPlaceholderText("Nombre de etiqueta"), {
      target: { value: "Fallida" },
    });
    fireEvent.click(screen.getByText("Crear"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Create failed", "error"),
    );
  });

  it("disables the Crear button when name is empty", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse([]));

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas/));
    fireEvent.click(screen.getByText(/Etiquetas/));

    expect(screen.getByText("Crear")).toBeDisabled();
  });

  // ─── delete label ─────────────────────────────────────────────────────────

  it("deletes a label and removes it from the panel", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse([LABELS[0]]));
    mockDeleteLabel.mockResolvedValue({ data: { deleted: true } });

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas \(1\/3\)/));
    fireEvent.click(screen.getByText(/Etiquetas \(1\/3\)/));

    fireEvent.click(screen.getByLabelText("Eliminar etiqueta VIP"));

    await waitFor(() =>
      expect(mockDeleteLabel).toHaveBeenCalledWith("q1", "l1"),
    );
    await waitFor(() =>
      expect(screen.queryByText("VIP")).not.toBeInTheDocument(),
    );
  });

  it("shows an error toast when deleteLabel fails", async () => {
    mockGetSubscribers.mockResolvedValue(makeResponse([]));
    mockGetLabels.mockResolvedValue(makeLabelsResponse([LABELS[0]]));
    mockDeleteLabel.mockRejectedValue(new Error("Delete failed"));

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas \(1\/3\)/));
    fireEvent.click(screen.getByText(/Etiquetas \(1\/3\)/));

    fireEvent.click(screen.getByLabelText("Eliminar etiqueta VIP"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Delete failed", "error"),
    );
  });

  // ─── assign / remove label on subscriber ─────────────────────────────────

  it("renders assigned label pills on subscribers", async () => {
    mockGetLabels.mockResolvedValue(makeLabelsResponse(LABELS));
    mockGetSubscribers.mockResolvedValue(
      makeResponse([{ ...SUBSCRIBERS[0], labels: [LABELS[0]] }]),
    );

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => expect(screen.getByText("Ana Torres")).toBeInTheDocument());
    expect(screen.getByText("VIP")).toBeInTheDocument();
  });

  it("shows the assign-label dropdown when the + button is clicked", async () => {
    mockGetLabels.mockResolvedValue(makeLabelsResponse(LABELS));
    mockGetSubscribers.mockResolvedValue(makeResponse([SUBSCRIBERS[0]]));

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByLabelText("Etiquetar a Ana Torres"));

    fireEvent.click(screen.getByLabelText("Etiquetar a Ana Torres"));

    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Casual")).toBeInTheDocument();
  });

  it("calls applyLabel when an unassigned label is toggled on", async () => {
    mockGetLabels.mockResolvedValue(makeLabelsResponse([LABELS[0]]));
    mockGetSubscribers.mockResolvedValue(makeResponse([SUBSCRIBERS[0]]));
    mockApplyLabel.mockResolvedValue({ data: { applied: true } });

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByLabelText("Etiquetar a Ana Torres"));

    fireEvent.click(screen.getByLabelText("Etiquetar a Ana Torres"));
    fireEvent.click(screen.getByText("VIP"));

    await waitFor(() =>
      expect(mockApplyLabel).toHaveBeenCalledWith("q1", "u1", "l1"),
    );
  });

  it("calls removeLabel when an assigned label is toggled off", async () => {
    mockGetLabels.mockResolvedValue(makeLabelsResponse([LABELS[0]]));
    mockGetSubscribers.mockResolvedValue(
      makeResponse([{ ...SUBSCRIBERS[0], labels: [LABELS[0]] }]),
    );
    mockRemoveLabel.mockResolvedValue({ data: { removed: true } });

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByLabelText("Etiquetar a Ana Torres"));

    fireEvent.click(screen.getByLabelText("Etiquetar a Ana Torres"));
    // [0] is the pill in the row; [1] is the dropdown item button label
    fireEvent.click(screen.getAllByText("VIP")[1]);

    await waitFor(() =>
      expect(mockRemoveLabel).toHaveBeenCalledWith("q1", "u1", "l1"),
    );
  });

  it("shows a checkmark next to assigned labels in the dropdown", async () => {
    mockGetLabels.mockResolvedValue(makeLabelsResponse([LABELS[0]]));
    mockGetSubscribers.mockResolvedValue(
      makeResponse([{ ...SUBSCRIBERS[0], labels: [LABELS[0]] }]),
    );

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByLabelText("Etiquetar a Ana Torres"));

    fireEvent.click(screen.getByLabelText("Etiquetar a Ana Torres"));

    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows an error toast when applyLabel fails", async () => {
    mockGetLabels.mockResolvedValue(makeLabelsResponse([LABELS[0]]));
    mockGetSubscribers.mockResolvedValue(makeResponse([SUBSCRIBERS[0]]));
    mockApplyLabel.mockRejectedValue(new Error("Apply failed"));

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByLabelText("Etiquetar a Ana Torres"));

    fireEvent.click(screen.getByLabelText("Etiquetar a Ana Torres"));
    fireEvent.click(screen.getByText("VIP"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Apply failed", "error"),
    );
  });

  it("removes label pills from subscriber after deleting the label globally", async () => {
    mockGetLabels.mockResolvedValue(makeLabelsResponse([LABELS[0]]));
    mockGetSubscribers.mockResolvedValue(
      makeResponse([{ ...SUBSCRIBERS[0], labels: [LABELS[0]] }]),
    );
    mockDeleteLabel.mockResolvedValue({ data: { deleted: true } });

    render(<SubscribersList qimelaId="q1" isCreator />);
    await waitFor(() => screen.getByText(/Etiquetas \(1\/3\)/));

    // Open label panel and delete VIP
    fireEvent.click(screen.getByText(/Etiquetas \(1\/3\)/));
    fireEvent.click(screen.getByLabelText("Eliminar etiqueta VIP"));

    await waitFor(() =>
      expect(mockDeleteLabel).toHaveBeenCalledWith("q1", "l1"),
    );
    // Pill on subscriber row should be gone too
    await waitFor(() =>
      expect(screen.queryAllByText("VIP")).toHaveLength(0),
    );
  });
});
