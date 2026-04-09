import { useQuery } from "@tanstack/react-query";
import type { QimelasResponse } from "@/types/qimela";
import { apiFetch } from "@/lib/apiClient";

async function fetchQimelas(): Promise<QimelasResponse> {
  return apiFetch<QimelasResponse>("/qimelas");
}

export function useQimelas() {
  return useQuery<QimelasResponse, Error>({
    queryKey: ["qimelas"],
    queryFn: fetchQimelas,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
