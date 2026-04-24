import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  imageUrl: string | null;
  totalPoints: number;
  correctPicksCount: number;
  exactResultsCount: number;
  rank: number;
}

export interface GetLeaderboardResponse {
  data: LeaderboardEntry[];
}

@Injectable()
export class GetLeaderboardUseCase {
  private readonly logger = new Logger(GetLeaderboardUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(qimelaId: string, phaseId?: string): Promise<GetLeaderboardResponse> {
    this.logger.log(`Getting leaderboard for qimela ${qimelaId}${phaseId ? ` phase ${phaseId}` : ''}`);

    const qimela = await this.prisma.qimela.findUnique({
      where: { id: qimelaId },
      select: { id: true },
    });

    if (!qimela) {
      throw new NotFoundException(`Qimela ${qimelaId} not found`);
    }

    if (phaseId) {
      return this.executeForPhase(qimelaId, phaseId);
    }

    const rows = await this.prisma.userQimelaPoints.findMany({
      where: { qimelaId },
      orderBy: [{ totalPoints: 'desc' }, { exactResultsCount: 'desc' }],
      include: { user: { select: { id: true, name: true, imageUrl: true } } },
    });

    const data: LeaderboardEntry[] = rows.map((row, index) => ({
      userId: row.userId,
      userName: row.user.name,
      imageUrl: row.user.imageUrl,
      totalPoints: row.totalPoints,
      correctPicksCount: row.correctPicksCount,
      exactResultsCount: row.exactResultsCount,
      rank: index + 1,
    }));

    return { data };
  }

  private async executeForPhase(qimelaId: string, phaseId: string): Promise<GetLeaderboardResponse> {
    const rows = await this.prisma.userSessionPoints.findMany({
      where: { qimelaId, session: { phaseId } },
      select: {
        userId: true,
        points: true,
        correctPick: true,
        exactResult: true,
        user: { select: { name: true, imageUrl: true } },
      },
    });

    const aggregated = new Map<string, LeaderboardEntry>();
    for (const row of rows) {
      const agg = aggregated.get(row.userId);
      if (agg) {
        agg.totalPoints += row.points;
        if (row.correctPick) agg.correctPicksCount++;
        if (row.exactResult) agg.exactResultsCount++;
      } else {
        aggregated.set(row.userId, {
          userId: row.userId,
          userName: row.user.name,
          imageUrl: row.user.imageUrl,
          totalPoints: row.points,
          correctPicksCount: row.correctPick ? 1 : 0,
          exactResultsCount: row.exactResult ? 1 : 0,
          rank: 0,
        });
      }
    }

    const sorted = [...aggregated.values()].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return b.exactResultsCount - a.exactResultsCount;
    });

    const data: LeaderboardEntry[] = sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return { data };
  }
}
