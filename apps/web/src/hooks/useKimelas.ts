import { useQuery } from "@tanstack/react-query";
import type { KimelasResponse } from "@/types/kimela";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchKimelas(): Promise<KimelasResponse> {
  const res = await fetch(`${API_URL}/kimelas`);
  if (!res.ok) throw new Error(`Failed to fetch kimelas: ${res.status}`);
  return res.json();
}

export function useKimelas() {
  return useQuery<KimelasResponse, Error>({
    queryKey: ["kimelas"],
    queryFn: fetchKimelas,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
