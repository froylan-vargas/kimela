import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qimelasApi, type ApiError } from "@/lib/apiClient";
import type { SavePredictionPickInput } from "@/types/prediction";

export interface SavePredictionBody {
  sessionId: string;
  picks: SavePredictionPickInput[];
}

export function useSavePrediction(qimelaId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { data: { sessionId: string; picks: SavePredictionPickInput[] } },
    ApiError,
    SavePredictionBody
  >({
    mutationFn: ({ sessionId, picks }) =>
      qimelasApi.saveSessionPicks(qimelaId, sessionId, picks),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["qimela", "sessions", "upcoming", qimelaId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["qimela", "sessions", "all", qimelaId],
        }),
      ]);
    },
  });
}
