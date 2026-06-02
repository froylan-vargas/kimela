import { useQuery } from "@tanstack/react-query";
import type { QimelasResponse } from "@/types/qimela";
import { apiFetch } from "@/lib/apiClient";

export const qimelasQueryKey = ["qimelas"] as const;

export async function fetchQimelas(): Promise<QimelasResponse> {
  return apiFetch<QimelasResponse>("/qimelas");
}

export function useQimelas() {
  return useQuery<QimelasResponse, Error>({
    queryKey: qimelasQueryKey,
    queryFn: fetchQimelas,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
