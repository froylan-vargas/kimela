import { useQuery } from "@tanstack/react-query";
import { qimelasApi } from "@/lib/apiClient";
import type { PhaseSessionsGroup } from "@/types/prediction";

export function useUpcomingSessions(qimelaId: string | null) {
  return useQuery<PhaseSessionsGroup[], Error>({
    queryKey: ["qimela", "sessions", "upcoming", qimelaId],
    queryFn: async () => {
      const res = await qimelasApi.getUpcomingSessions(qimelaId!);
      return res.data;
    },
    enabled: !!qimelaId,
    staleTime: 60_000,
  });
}

export function useAllQimelaSessions(qimelaId: string | null) {
  return useQuery<PhaseSessionsGroup[], Error>({
    queryKey: ["qimela", "sessions", "all", qimelaId],
    queryFn: async () => {
      const res = await qimelasApi.getAllSessions(qimelaId!);
      return res.data;
    },
    enabled: !!qimelaId,
    staleTime: 60_000,
  });
}
