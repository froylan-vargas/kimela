import { useQuery } from "@tanstack/react-query";
import { qimelasApi, type QimelaPhase } from "@/lib/apiClient";

export function useQimelaPhases(qimelaId: string | null) {
  return useQuery<QimelaPhase[], Error>({
    queryKey: ["qimela", "phases", qimelaId],
    queryFn: async () => {
      const res = await qimelasApi.getPhases(qimelaId!);
      return res.data;
    },
    enabled: !!qimelaId,
    staleTime: 60_000,
  });
}
