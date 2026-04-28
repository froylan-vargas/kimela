import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { formatFloatingIso } from '../utils/session-time';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const MAX_COMPARE_USERS = 3;

export interface ComparisonContenderDto {
  id: string;
  name: string;
  imgUrl: string | null;
}

export interface ComparisonActualResultDto {
  homeScore: string | null;
  awayScore: string | null;
}

export interface ComparisonUserResultDto {
  userId: string;
  userName: string;
  homePick: string | null;
  awayPick: string | null;
  points: number | null;
}

export interface ComparisonSessionDto {
  id: string;
  name: string;
  scheduledAt: string;
  phaseId: string;
  phaseName: string;
  home: ComparisonContenderDto;
  away: ComparisonContenderDto;
  actualResult: ComparisonActualResultDto;
  users: ComparisonUserResultDto[];
}

export interface GetQimelaResultsQuery {
  qimelaId: string;
  userId: string;
  phaseId: string;
  compareUserIds: string[];
}

export interface GetQimelaResultsResponse {
  data: ComparisonSessionDto[];
}

type SessionRecord = {
  id: string;
  name: string;
  scheduledAt: Date;
  phase: { id: string; name: string };
  contenders: { role: string | null; contender: { id: string; name: string; imgUrl: string | null } }[];
  results: { pickCategoryId: string; value: string | null }[];
};

@Injectable()
export class GetQimelaResultsUseCase {

  constructor(
    @InjectPinoLogger(GetQimelaResultsUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetQimelaResultsQuery): Promise<GetQimelaResultsResponse> {
    this.logger.info(
      `Fetching results for qimela ${query.qimelaId}, phase ${query.phaseId}, user ${query.userId}`,
    );

    if (query.compareUserIds.length > MAX_COMPARE_USERS) {
      throw new BadRequestException(`Máximo ${MAX_COMPARE_USERS} usuarios para comparar`);
    }

    const qimela = await this.qimelaRepository.findById(query.qimelaId);
    if (!qimela) {
      throw new NotFoundException('La qimela no existe');
    }

    if (!qimela.eventId) {
      throw new UnprocessableEntityException({
        code: 'QIMELA_NO_EVENT',
        message: 'Esta qimela no tiene un evento asociado',
      });
    }

    await this.assertUserHasAccess(query.userId, qimela.id, qimela.creatorId);

    const phase = await this.prisma.phase.findFirst({
      where: { id: query.phaseId, eventId: qimela.eventId },
      select: { id: true },
    });
    if (!phase) {
      throw new NotFoundException('La fase no pertenece a esta qimela');
    }

    const userIds = this.buildUserIds(query.userId, query.compareUserIds);
    await this.assertUsersBelongToQimela(userIds, qimela.id, qimela.creatorId, query.userId);

    const sport = await this.prisma.sport.findUnique({
      where: { id: qimela.sportId },
      select: { id: true },
    });
    if (!sport) {
      throw new NotFoundException('El deporte no existe');
    }

    const scoreCategories = await this.prisma.pickCategory.findMany({
      where: { sportId: sport.id, name: { in: ['score_home', 'score_away'] } },
      select: { id: true, name: true },
    });
    const scoreHomeCategoryId = scoreCategories.find((c) => c.name === 'score_home')?.id ?? null;
    const scoreAwayCategoryId = scoreCategories.find((c) => c.name === 'score_away')?.id ?? null;

    const sessions: SessionRecord[] = await this.prisma.session.findMany({
      where: {
        phaseId: query.phaseId,
      },
      include: {
        phase: { select: { id: true, name: true } },
        contenders: {
          include: {
            contender: { select: { id: true, name: true, imgUrl: true } },
          },
        },
        results: { select: { pickCategoryId: true, value: true } },
      },
      orderBy: [{ scheduledAt: 'asc' }],
    });

    if (sessions.length === 0) {
      return { data: [] };
    }

    const sessionIds = sessions.map((s) => s.id);
    const [users, picks, pointsRows] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
      this.prisma.userPick.findMany({
        where: {
          userId: { in: userIds },
          sessionId: { in: sessionIds },
          pickCategoryId: { in: [scoreHomeCategoryId, scoreAwayCategoryId].filter(Boolean) as string[] },
        },
        select: { userId: true, sessionId: true, pickCategoryId: true, value: true },
      }),
      this.prisma.userSessionPoints.findMany({
        where: {
          qimelaId: qimela.id,
          userId: { in: userIds },
          sessionId: { in: sessionIds },
        },
        select: { userId: true, sessionId: true, points: true },
      }),
    ]);

    const userById = new Map(users.map((u) => [u.id, u.name]));
    const pickKey = (userId: string, sessionId: string, categoryId: string) => `${userId}::${sessionId}::${categoryId}`;
    const pickByKey = new Map(
      picks.map((p) => [pickKey(p.userId, p.sessionId, p.pickCategoryId), p.value] as const),
    );
    const pointsKey = (userId: string, sessionId: string) => `${userId}::${sessionId}`;
    const pointsByKey = new Map(
      pointsRows.map((p) => [pointsKey(p.userId, p.sessionId), p.points] as const),
    );

    const data: ComparisonSessionDto[] = sessions.map((session) => {
      const home = session.contenders.find((c) => c.role === 'home')?.contender ?? session.contenders[0]?.contender;
      const away = session.contenders.find((c) => c.role === 'away')?.contender ?? session.contenders[1]?.contender;

      const resultByCategoryId = new Map(session.results.map((r) => [r.pickCategoryId, r.value] as const));
      const actualHome = scoreHomeCategoryId ? resultByCategoryId.get(scoreHomeCategoryId) ?? null : null;
      const actualAway = scoreAwayCategoryId ? resultByCategoryId.get(scoreAwayCategoryId) ?? null : null;

      return {
        id: session.id,
        name: session.name,
        scheduledAt: formatFloatingIso(session.scheduledAt),
        phaseId: session.phase.id,
        phaseName: session.phase.name,
        home: {
          id: home?.id ?? '',
          name: home?.name ?? '',
          imgUrl: home?.imgUrl ?? null,
        },
        away: {
          id: away?.id ?? '',
          name: away?.name ?? '',
          imgUrl: away?.imgUrl ?? null,
        },
        actualResult: { homeScore: actualHome, awayScore: actualAway },
        users: userIds.map((uid) => {
          const homePick = scoreHomeCategoryId
            ? pickByKey.get(pickKey(uid, session.id, scoreHomeCategoryId)) ?? null
            : null;
          const awayPick = scoreAwayCategoryId
            ? pickByKey.get(pickKey(uid, session.id, scoreAwayCategoryId)) ?? null
            : null;
          const hasAnyPick = homePick !== null || awayPick !== null;
          const points = pointsByKey.get(pointsKey(uid, session.id));

          return {
            userId: uid,
            userName: userById.get(uid) ?? 'Usuario',
            homePick,
            awayPick,
            points: hasAnyPick && points !== undefined ? points : null,
          };
        }),
      };
    });

    this.logger.info(`Returning ${data.length} sessions for phase ${query.phaseId}`);

    return { data };
  }

  private buildUserIds(currentUserId: string, compareUserIds: string[]): string[] {
    const unique = new Set<string>([currentUserId]);
    for (const id of compareUserIds) {
      if (unique.size >= MAX_COMPARE_USERS + 1) break;
      unique.add(id);
    }
    return Array.from(unique);
  }

  private async assertUserHasAccess(userId: string, qimelaId: string, creatorId: string): Promise<void> {
    if (creatorId === userId) {
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, qimelaId },
      select: { id: true },
    });

    if (!subscription) {
      throw new ForbiddenException('No tienes acceso a esta qimela');
    }
  }

  private async assertUsersBelongToQimela(
    userIds: string[],
    qimelaId: string,
    creatorId: string,
    currentUserId: string,
  ): Promise<void> {
    const extras = userIds.filter((id) => id !== creatorId && id !== currentUserId);
    if (extras.length === 0) return;

    const subscriptions = await this.prisma.subscription.findMany({
      where: { qimelaId, userId: { in: extras } },
      select: { userId: true },
    });

    const subscribedIds = new Set(subscriptions.map((s) => s.userId));
    for (const id of extras) {
      if (!subscribedIds.has(id)) {
        throw new ForbiddenException('Uno de los usuarios no pertenece a esta qimela');
      }
    }
  }
}
