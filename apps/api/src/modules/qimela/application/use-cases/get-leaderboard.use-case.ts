import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../../shared/prisma/prisma.service";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

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
  constructor(
    @InjectPinoLogger(GetLeaderboardUseCase.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    qimelaId: string,
    phaseId?: string,
  ): Promise<GetLeaderboardResponse> {
    this.logger.info(
      `Getting leaderboard for qimela ${qimelaId}${phaseId ? ` phase ${phaseId}` : ""}`,
    );

    const qimela = await this.prisma.qimela.findUnique({
      where: { id: qimelaId },
      select: {
        id: true,
        creator: { select: { id: true, name: true, imageUrl: true } },
        subscriptions: {
          select: {
            user: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });

    if (!qimela) {
      throw new NotFoundException(`qimela ${qimelaId} not found`);
    }

    if (phaseId) {
      return this.executeForPhase(
        qimelaId,
        phaseId,
        this.getParticipants(qimela),
      );
    }

    const rows = await this.prisma.userQimelaPoints.findMany({
      where: { qimelaId },
      orderBy: [{ totalPoints: "desc" }, { exactResultsCount: "desc" }],
      include: { user: { select: { id: true, name: true, imageUrl: true } } },
    });

    const pointsByUserId = new Map(rows.map((row) => [row.userId, row]));
    const data = this.rankParticipants(
      this.getParticipants(qimela).map((participant) => {
        const points = pointsByUserId.get(participant.userId);
        return {
          ...participant,
          totalPoints: points?.totalPoints ?? 0,
          correctPicksCount: points?.correctPicksCount ?? 0,
          exactResultsCount: points?.exactResultsCount ?? 0,
          rank: 0,
        };
      }),
    );

    return { data };
  }

  private async executeForPhase(
    qimelaId: string,
    phaseId: string,
    participants: Omit<
      LeaderboardEntry,
      "totalPoints" | "correctPicksCount" | "exactResultsCount" | "rank"
    >[],
  ): Promise<GetLeaderboardResponse> {
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

    const aggregatedWithEmptyParticipants = participants.map((participant) => ({
      ...participant,
      totalPoints: aggregated.get(participant.userId)?.totalPoints ?? 0,
      correctPicksCount:
        aggregated.get(participant.userId)?.correctPicksCount ?? 0,
      exactResultsCount:
        aggregated.get(participant.userId)?.exactResultsCount ?? 0,
      rank: 0,
    }));

    return { data: this.rankParticipants(aggregatedWithEmptyParticipants) };
  }

  private getParticipants(qimela: {
    creator: { id: string; name: string; imageUrl: string | null };
    subscriptions: {
      user: { id: string; name: string; imageUrl: string | null };
    }[];
  }): Omit<
    LeaderboardEntry,
    "totalPoints" | "correctPicksCount" | "exactResultsCount" | "rank"
  >[] {
    const byUserId = new Map<
      string,
      Omit<
        LeaderboardEntry,
        "totalPoints" | "correctPicksCount" | "exactResultsCount" | "rank"
      >
    >();
    byUserId.set(qimela.creator.id, {
      userId: qimela.creator.id,
      userName: qimela.creator.name,
      imageUrl: qimela.creator.imageUrl,
    });
    for (const subscription of qimela.subscriptions) {
      byUserId.set(subscription.user.id, {
        userId: subscription.user.id,
        userName: subscription.user.name,
        imageUrl: subscription.user.imageUrl,
      });
    }
    return [...byUserId.values()];
  }

  private rankParticipants(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints)
          return b.totalPoints - a.totalPoints;
        if (b.exactResultsCount !== a.exactResultsCount)
          return b.exactResultsCount - a.exactResultsCount;
        return a.userName.localeCompare(b.userName, "es");
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
}
