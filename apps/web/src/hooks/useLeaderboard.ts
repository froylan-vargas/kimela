import { useQuery } from "@tanstack/react-query";
import { qimelasApi, type LeaderboardEntry } from "@/lib/apiClient";

export interface LeaderboardRow extends LeaderboardEntry {
  initials: string;
  isCurrentUser: boolean;
  imageUrl: string | null;
}

export function useLeaderboard(qimelaId: string | null, currentUserId?: string, phaseId?: string) {
  return useQuery<LeaderboardRow[], Error>({
    queryKey: ["qimela", "leaderboard", qimelaId, phaseId ?? null],
    queryFn: async () => {
      const res = await qimelasApi.getLeaderboard(qimelaId!, phaseId);
      return res.data.map((entry) => ({
        ...entry,
        initials: entry.userName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join(""),
        isCurrentUser: !!currentUserId && entry.userId === currentUserId,
      }));
    },
    enabled: !!qimelaId,
    staleTime: 60_000,
  });
}
