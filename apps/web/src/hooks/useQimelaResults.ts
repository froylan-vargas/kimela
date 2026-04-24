import { useQuery } from "@tanstack/react-query";
import { qimelasApi, type ComparisonSession } from "@/lib/apiClient";

export function useQimelaResults(
  qimelaId: string | null,
  phaseId: string | null,
  compareUserIds: string[],
) {
  return useQuery<ComparisonSession[], Error>({
    queryKey: [
      "qimela",
      "results",
      qimelaId,
      phaseId,
      [...compareUserIds].sort().join(","),
    ],
    queryFn: async () => {
      const res = await qimelasApi.getResults(qimelaId!, phaseId!, compareUserIds);
      return res.data;
    },
    enabled: !!qimelaId && !!phaseId,
    staleTime: 30_000,
  });
}
