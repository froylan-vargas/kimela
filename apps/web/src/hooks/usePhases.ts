import { useQuery } from "@tanstack/react-query";
import type { Phase } from "@/types/phase";
import { adminApi } from "@/lib/apiClient";

async function fetchPhases(eventId: string): Promise<Phase[]> {
  const res = await adminApi.getPhases(eventId);
  return res.data;
}

export function usePhases(eventId: string) {
  return useQuery<Phase[], Error>({
    queryKey: ["admin", "phases", eventId],
    queryFn: () => fetchPhases(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
