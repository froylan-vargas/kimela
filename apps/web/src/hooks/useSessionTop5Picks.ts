import { useQuery } from "@tanstack/react-query";
import { qimelasApi, type SessionTop5Picks } from "@/lib/apiClient";

export function useSessionTop5Picks(
  qimelaId: string | null,
  sessionId: string | null,
  phaseId: string | null,
  enabled: boolean,
) {
  return useQuery<SessionTop5Picks, Error>({
    queryKey: ["qimela", "session-top5", qimelaId, sessionId, phaseId],
    queryFn: () =>
      qimelasApi.getSessionTop5Picks(qimelaId!, sessionId!, phaseId ?? undefined),
    enabled: enabled && !!qimelaId && !!sessionId,
    staleTime: 30_000,
  });
}
