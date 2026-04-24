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
  },
}));

vi.mock("@/lib/errors", () => ({
  toUserMessage: (err: unknown) => (err instanceof Error ? err.message : "Error"),
}));

import { qimelasApi } from "@/lib/apiClient";

const mockGetSubscribers = qimelasApi.getSubscribers as ReturnType<typeof vi.fn>;
const mockRemoveSubscriber = qimelasApi.removeSubscriber as ReturnType<typeof vi.fn>;

const makeResponse = (
  subscribers: { userId: string; name: string; email: string }[],
  total?: number,
) => ({
  data: {
    subscribers,
    total: total ?? subscribers.length,
    page: 1,
    limit: 10,
  },
});

const SUBSCRIBERS = [
  { userId: "u1", name: "Ana Torres", email: "ana@example.com" },
  { userId: "u2", name: "Luis Ramos", email: "luis@example.com" },
];

describe("SubscribersList", () => {
  beforeEach(() => {
    mockGetSubscribers.mockReset();
    mockRemoveSubscriber.mockReset();
    mockToast.mockReset();
  });

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
});
