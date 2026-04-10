import { useQuery } from "@tanstack/react-query";
import type { Sport } from "@/types/sport";
import { sportsApi } from "@/lib/apiClient";

async function fetchSports(): Promise<Sport[]> {
  const res = await sportsApi.list();
  return res.data;
}

export function useSports() {
  return useQuery<Sport[], Error>({
    queryKey: ["sports"],
    queryFn: fetchSports,
    staleTime: 1000 * 60 * 60, // 60 minutes
  });
}
