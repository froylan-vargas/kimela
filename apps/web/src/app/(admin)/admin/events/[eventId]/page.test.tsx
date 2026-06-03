import { Suspense } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventManagementPage from "./page";

const { deletePhase, getQueryData, invalidateQueries, setQueryData, toast, uploadSessions } = vi.hoisted(() => ({
  deletePhase: vi.fn().mockResolvedValue(undefined),
  getQueryData: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  setQueryData: vi.fn(),
  toast: vi.fn(),
  uploadSessions: vi.fn().mockResolvedValue({ data: [{ id: "session-1" }, { id: "session-2" }] }),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    use: <T,>(value: T) => value,
  };
});

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");

  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData,
      getQueryData,
      invalidateQueries,
    }),
  };
});

vi.mock("@/hooks/usePhases", () => ({
  usePhases: () => ({
    data: [
      {
        id: "phase-1",
        name: "Jornada 1",
        order: 1,
        type: "REGULAR_SEASON",
        status: "ACTIVE",
        eventId: "event-1",
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useSessions", () => ({
  useSessions: () => ({
    data: [
      {
        id: "session-1",
        name: "Match 1",
        scheduledAt: "2026-04-22T20:00:00.000Z",
        status: "SCHEDULED",
        home: { id: "c1", name: "Team A", imgUrl: null },
        away: { id: "c2", name: "Team B", imgUrl: null },
        score: { home: null, away: null },
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/lib/apiClient", () => ({
  adminApi: {
    reorderPhases: vi.fn(),
    activatePhase: vi.fn(),
    completePhase: vi.fn(),
    deletePhase,
    uploadSessions,
  },
}));

vi.mock("@/context/ToastContext", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("@/lib/errors", () => ({
  toUserMessage: () => "Error",
}));

vi.mock("@/components/admin/PhaseList/PhaseList", () => ({
  default: ({
    phases,
    onSelect,
    onDelete,
  }: {
    phases: Array<{ id: string; name: string }>;
    onSelect: (phase: { id: string; name: string }) => void;
    onDelete: (phaseId: string) => void;
  }) => (
    <div>
      {phases.map((phase) => (
        <div key={phase.id}>
          <button type="button" onClick={() => onSelect(phase)}>
            {phase.name}
          </button>
          <button type="button" onClick={() => onDelete(phase.id)}>
            Eliminar {phase.name}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/admin/PhaseForm/PhaseForm", () => ({
  default: () => <div>Phase form</div>,
}));

vi.mock("@/components/admin/SessionResultsEditor/SessionResultsEditor", () => ({
  default: ({ sessions }: { sessions: Array<{ id: string }> }) => (
    <div>Resultados view: {sessions.length}</div>
  ),
}));

vi.mock("@/components/admin/SessionUpload/SessionUpload", () => ({
  default: ({
    onUpload,
    isUploading,
  }: {
    onUpload: (file: File) => Promise<void>;
    isUploading: boolean;
  }) => (
    <button
      type="button"
      onClick={() => onUpload(new File(["csv"], "sessions.csv", { type: "text/csv" }))}
      disabled={isUploading}
    >
      Subir CSV
    </button>
  ),
}));

vi.mock("./page.module.scss", () => ({ default: {} }));

describe("EventManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQueryData.mockReturnValue([
      {
        id: "phase-1",
        name: "Jornada 1",
        order: 1,
        type: "REGULAR_SEASON",
        status: "UPCOMING",
        eventId: "event-1",
      },
    ]);
  });

  it("shows uploaded sessions in the resultados tab after loading a CSV", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <EventManagementPage
            params={{ eventId: "event-1" } as unknown as Promise<{ eventId: string }>}
            searchParams={{ name: "Liga%20MX" } as unknown as Promise<{ name?: string }>}
          />
        </Suspense>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Jornada 1" }));
    expect(screen.queryByRole("tab", { name: "Partidos" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Resultados" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Cargar CSV" }));
    fireEvent.click(screen.getByRole("button", { name: "Subir CSV" }));

    await waitFor(() => {
      expect(uploadSessions).toHaveBeenCalledWith(
        "event-1",
        "phase-1",
        expect.any(File),
      );
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["admin", "sessions", "event-1", "phase-1"],
      });
      expect(screen.getByRole("tab", { name: "Resultados" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByText("Resultados view: 1")).toBeInTheDocument();
    });
  });

  it("asks for confirmation before deleting a phase", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <EventManagementPage
            params={{ eventId: "event-1" } as unknown as Promise<{ eventId: string }>}
            searchParams={{ name: "Liga%20MX" } as unknown as Promise<{ name?: string }>}
          />
        </Suspense>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Jornada 1" }));

    const dialog = screen.getByRole("dialog", { name: "Eliminar fase" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Jornada 1")).toBeInTheDocument();
    expect(deletePhase).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog", { name: "Eliminar fase" })).not.toBeInTheDocument();
    expect(deletePhase).not.toHaveBeenCalled();
  });

  it("deletes the phase after confirmation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <EventManagementPage
            params={{ eventId: "event-1" } as unknown as Promise<{ eventId: string }>}
            searchParams={{ name: "Liga%20MX" } as unknown as Promise<{ name?: string }>}
          />
        </Suspense>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Jornada 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar fase" }));

    await waitFor(() => {
      expect(deletePhase).toHaveBeenCalledWith("event-1", "phase-1");
      expect(toast).toHaveBeenCalledWith("Fase eliminada correctamente.", "success");
    });
  });
});
