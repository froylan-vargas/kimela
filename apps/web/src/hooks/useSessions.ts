import { useQuery } from "@tanstack/react-query";
import type { Session } from "@/types/session";
import { adminApi } from "@/lib/apiClient";

async function fetchSessions(eventId: string, phaseId: string): Promise<Session[]> {
  const res = await adminApi.getSessions(eventId, phaseId);
  return res.data;
}

export function useSessions(eventId: string | null, phaseId: string | null) {
  return useQuery<Session[], Error>({
    queryKey: ["admin", "sessions", eventId, phaseId],
    queryFn: () => fetchSessions(eventId!, phaseId!),
    enabled: !!eventId && !!phaseId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
