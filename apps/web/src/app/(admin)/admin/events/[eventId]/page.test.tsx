import { Suspense } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventManagementPage from "./page";

const { invalidateQueries, toast, uploadSessions } = vi.hoisted(() => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
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
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
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
    deletePhase: vi.fn(),
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
  }: {
    phases: Array<{ id: string; name: string }>;
    onSelect: (phase: { id: string; name: string }) => void;
  }) => (
    <div>
      {phases.map((phase) => (
        <button key={phase.id} type="button" onClick={() => onSelect(phase)}>
          {phase.name}
        </button>
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
            params={{ eventId: "event-1" } as Promise<{ eventId: string }>}
            searchParams={{ name: "Liga%20MX" } as Promise<{ name?: string }>}
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
});
