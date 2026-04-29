import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../shared/prisma/prisma.service";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

export interface Top5PickEntry {
  rank: number;
  userId: string;
  userName: string;
  homePick: string | null;
  awayPick: string | null;
}

export interface GetSessionTop5PicksResponse {
  overall: Top5PickEntry[];
  phase: Top5PickEntry[] | null;
}

@Injectable()
export class GetSessionTop5PicksUseCase {
  constructor(
    @InjectPinoLogger(GetSessionTop5PicksUseCase.name)
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    qimelaId: string,
    sessionId: string,
    requesterId: string,
    phaseId?: string,
  ): Promise<GetSessionTop5PicksResponse> {
    this.logger.info(
      `Getting top5 picks for session ${sessionId} in qimela ${qimelaId}`,
    );

    const qimela = await this.prisma.qimela.findUnique({
      where: { id: qimelaId },
      select: {
        id: true,
        creatorId: true,
        sportId: true,
        creator: { select: { id: true, name: true } },
        subscriptions: {
          select: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!qimela) throw new NotFoundException(`qimela ${qimelaId} not found`);

    await this.assertAccess(requesterId, qimela.id, qimela.creatorId);

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, phaseId: true, phase: { select: { eventId: true } } },
    });

    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const scoreCategories = await this.prisma.pickCategory.findMany({
      where: {
        sportId: qimela.sportId,
        name: { in: ["score_home", "score_away"] },
      },
      select: { id: true, name: true },
    });
    const homeCatId =
      scoreCategories.find((c) => c.name === "score_home")?.id ?? null;
    const awayCatId =
      scoreCategories.find((c) => c.name === "score_away")?.id ?? null;

    const participants = this.buildParticipants(qimela);
    const overall = await this.buildTop5(
      qimelaId,
      participants,
      sessionId,
      homeCatId,
      awayCatId,
    );

    let phase: Top5PickEntry[] | null = null;
    if (phaseId) {
      phase = await this.buildTop5ForPhase(
        qimelaId,
        phaseId,
        participants,
        sessionId,
        homeCatId,
        awayCatId,
      );
    }

    return { overall, phase };
  }

  private async buildTop5(
    qimelaId: string,
    participants: { userId: string; userName: string }[],
    sessionId: string,
    homeCatId: string | null,
    awayCatId: string | null,
  ): Promise<Top5PickEntry[]> {
    const rows = await this.prisma.userQimelaPoints.findMany({
      where: { qimelaId },
      orderBy: [{ totalPoints: "desc" }, { exactResultsCount: "desc" }],
    });

    const pointsByUserId = new Map(rows.map((r) => [r.userId, r]));

    const ranked = [...participants]
      .sort((a, b) => {
        const pa = pointsByUserId.get(a.userId);
        const pb = pointsByUserId.get(b.userId);
        const ptA = pa?.totalPoints ?? 0;
        const ptB = pb?.totalPoints ?? 0;
        if (ptB !== ptA) return ptB - ptA;
        const exA = pa?.exactResultsCount ?? 0;
        const exB = pb?.exactResultsCount ?? 0;
        if (exB !== exA) return exB - exA;
        return a.userName.localeCompare(b.userName, "es");
      })
      .slice(0, 5)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    return this.attachPicks(ranked, sessionId, homeCatId, awayCatId);
  }

  private async buildTop5ForPhase(
    qimelaId: string,
    phaseId: string,
    participants: { userId: string; userName: string }[],
    sessionId: string,
    homeCatId: string | null,
    awayCatId: string | null,
  ): Promise<Top5PickEntry[]> {
    const rows = await this.prisma.userSessionPoints.findMany({
      where: { qimelaId, session: { phaseId } },
      select: { userId: true, points: true, exactResult: true },
    });

    const aggregated = new Map<
      string,
      { totalPoints: number; exactResultsCount: number }
    >();
    for (const row of rows) {
      const agg = aggregated.get(row.userId);
      if (agg) {
        agg.totalPoints += row.points;
        if (row.exactResult) agg.exactResultsCount++;
      } else {
        aggregated.set(row.userId, {
          totalPoints: row.points,
          exactResultsCount: row.exactResult ? 1 : 0,
        });
      }
    }

    const ranked = [...participants]
      .sort((a, b) => {
        const pa = aggregated.get(a.userId);
        const pb = aggregated.get(b.userId);
        const ptA = pa?.totalPoints ?? 0;
        const ptB = pb?.totalPoints ?? 0;
        if (ptB !== ptA) return ptB - ptA;
        const exA = pa?.exactResultsCount ?? 0;
        const exB = pb?.exactResultsCount ?? 0;
        if (exB !== exA) return exB - exA;
        return a.userName.localeCompare(b.userName, "es");
      })
      .slice(0, 5)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    return this.attachPicks(ranked, sessionId, homeCatId, awayCatId);
  }

  private async attachPicks(
    ranked: { rank: number; userId: string; userName: string }[],
    sessionId: string,
    homeCatId: string | null,
    awayCatId: string | null,
  ): Promise<Top5PickEntry[]> {
    const userIds = ranked.map((r) => r.userId);
    const categoryIds = [homeCatId, awayCatId].filter(Boolean) as string[];

    const picks =
      categoryIds.length > 0
        ? await this.prisma.userPick.findMany({
            where: {
              userId: { in: userIds },
              sessionId,
              pickCategoryId: { in: categoryIds },
            },
            select: { userId: true, pickCategoryId: true, value: true },
          })
        : [];

    const pickKey = (uid: string, catId: string) => `${uid}::${catId}`;
    const pickMap = new Map(
      picks.map((p) => [pickKey(p.userId, p.pickCategoryId), p.value]),
    );

    return ranked.map((entry) => ({
      rank: entry.rank,
      userId: entry.userId,
      userName: entry.userName,
      homePick: homeCatId
        ? (pickMap.get(pickKey(entry.userId, homeCatId)) ?? null)
        : null,
      awayPick: awayCatId
        ? (pickMap.get(pickKey(entry.userId, awayCatId)) ?? null)
        : null,
    }));
  }

  private buildParticipants(qimela: {
    creator: { id: string; name: string };
    subscriptions: { user: { id: string; name: string } }[];
  }): { userId: string; userName: string }[] {
    const map = new Map<string, { userId: string; userName: string }>();
    map.set(qimela.creator.id, {
      userId: qimela.creator.id,
      userName: qimela.creator.name,
    });
    for (const sub of qimela.subscriptions) {
      map.set(sub.user.id, { userId: sub.user.id, userName: sub.user.name });
    }
    return [...map.values()];
  }

  private async assertAccess(
    userId: string,
    qimelaId: string,
    creatorId: string,
  ): Promise<void> {
    if (userId === creatorId) return;
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, qimelaId },
      select: { id: true },
    });
    if (!sub) throw new ForbiddenException("No tienes acceso a esta qimela");
  }
}
