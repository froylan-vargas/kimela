import { useQuery } from "@tanstack/react-query";
import type { SportEvent } from "@/types/event";
import { adminApi } from "@/lib/apiClient";

async function fetchAdminEvents(sportId: string): Promise<SportEvent[]> {
  const res = await adminApi.listEvents(sportId);
  return res.data;
}

export function useAdminEvents(sportId: string | null) {
  return useQuery<SportEvent[], Error>({
    queryKey: ["admin", "events", sportId],
    queryFn: () => fetchAdminEvents(sportId!),
    enabled: !!sportId,
    staleTime: 1000 * 60 * 60, // 60 minutes
  });
}
