import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalPoints: number;
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

  async execute(qimelaId: string): Promise<GetLeaderboardResponse> {
    this.logger.log(`Getting leaderboard for qimela ${qimelaId}`);

    const qimela = await this.prisma.qimela.findUnique({
      where: { id: qimelaId },
      select: { id: true },
    });

    if (!qimela) {
      throw new NotFoundException(`Qimela ${qimelaId} not found`);
    }

    const rows = await this.prisma.userQimelaPoints.findMany({
      where: { qimelaId },
      orderBy: [{ totalPoints: 'desc' }, { exactResultsCount: 'desc' }],
      include: { user: { select: { id: true, name: true } } },
    });

    const data: LeaderboardEntry[] = rows.map((row, index) => ({
      userId: row.userId,
      userName: row.user.name,
      totalPoints: row.totalPoints,
      exactResultsCount: row.exactResultsCount,
      rank: index + 1,
    }));

    return { data };
  }
}
