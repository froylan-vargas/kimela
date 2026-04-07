import { useQuery } from "@tanstack/react-query";
import type { KimelasResponse } from "@/types/kimela";
import { apiFetch } from "@/lib/apiClient";

async function fetchKimelas(): Promise<KimelasResponse> {
  return apiFetch<KimelasResponse>("/kimelas");
}

export function useKimelas() {
  return useQuery<KimelasResponse, Error>({
    queryKey: ["kimelas"],
    queryFn: fetchKimelas,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
