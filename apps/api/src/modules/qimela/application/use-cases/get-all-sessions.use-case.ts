import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PhaseSessionsGroupDto, PickDto, SessionWithPickDto } from '../dtos/session-with-pick.dto';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { formatFloatingIso, getFloatingNow } from '../utils/session-time';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const PICKS_DEADLINE_MS = 3 * 60 * 1000;

type PhaseRow = {
  id: string;
  name: string;
  order: number;
};

type SessionRecord = {
  id: string;
  name: string;
  scheduledAt: Date;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  phase: { id: string; name: string; order: number };
  contenders: { role: string | null; contender: { id: string; name: string; imgUrl: string | null } }[];
  sessionCategories: { pickCategory: { id: string; name: string; label: string; valueType: 'CONTENDER' | 'SCALAR' } }[];
};

export interface GetAllSessionsQuery {
  qimelaId: string;
  userId: string;
}

export interface GetAllSessionsResponse {
  data: PhaseSessionsGroupDto[];
}

@Injectable()
export class GetAllSessionsUseCase {

  constructor(
    @InjectPinoLogger(GetAllSessionsUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetAllSessionsQuery): Promise<GetAllSessionsResponse> {
    this.logger.info(`Fetching all sessions for qimela ${query.qimelaId} and user ${query.userId}`);

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

    const floatingNow = getFloatingNow();
    const cutoff = new Date(floatingNow.getTime() + PICKS_DEADLINE_MS);

    const phases: PhaseRow[] = await this.prisma.phase.findMany({
      where: { eventId: qimela.eventId },
      select: { id: true, name: true, order: true },
      orderBy: { order: 'asc' },
    });

    if (phases.length === 0) {
      throw new UnprocessableEntityException({
        code: 'QIMELA_NO_EVENT_PHASES',
        message: 'Esta qimela no tiene fases disponibles',
      });
    }

    const sessions: SessionRecord[] = await this.prisma.session.findMany({
      where: {
        phaseId: { in: phases.map((phase: PhaseRow) => phase.id) },
        scheduledAt: { gt: cutoff },
      },
      include: {
        phase: {
          select: { id: true, name: true, order: true },
        },
        contenders: {
          include: {
            contender: {
              select: { id: true, name: true, imgUrl: true },
            },
          },
        },
        sessionCategories: {
          include: {
            pickCategory: {
              select: { id: true, name: true, label: true, valueType: true },
            },
          },
        },
      },
      orderBy: [{ phase: { order: 'asc' } }, { scheduledAt: 'asc' }],
    });

    const picksBySessionId = await this.getPicksBySessionId(
      query.userId,
      sessions.map((session: SessionRecord) => session.id),
    );

    const sessionsByPhaseId = new Map<string, SessionWithPickDto[]>();
    for (const session of sessions) {
      const items = sessionsByPhaseId.get(session.phase.id) ?? [];
      items.push(this.toSessionDto(session, picksBySessionId.get(session.id) ?? []));
      sessionsByPhaseId.set(session.phase.id, items);
    }

    const data: PhaseSessionsGroupDto[] = phases
      .map((phase: PhaseRow) => ({
        phaseId: phase.id,
        phaseName: phase.name,
        phaseOrder: phase.order,
        sessions: sessionsByPhaseId.get(phase.id) ?? [],
      }))
      .filter((group) => group.sessions.length > 0);

    this.logger.info(`Returning ${sessions.length} sessions across ${data.length} phases for qimela ${query.qimelaId}`);

    return { data };
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

  private async getPicksBySessionId(userId: string, sessionIds: string[]) {
    const map = new Map<string, PickDto[]>();

    if (sessionIds.length === 0) {
      return map;
    }

    const rows = await this.prisma.userPick.findMany({
      where: {
        userId,
        sessionId: { in: sessionIds },
      },
      include: {
        pickCategory: {
          select: { id: true, name: true, label: true, valueType: true },
        },
      },
    });

    for (const row of rows) {
      const picks = map.get(row.sessionId) ?? [];
      picks.push({
        pickCategoryId: row.pickCategory.id,
        name: row.pickCategory.name,
        label: row.pickCategory.label,
        valueType: row.pickCategory.valueType,
        value: row.value,
        pickedContenderId: row.pickedContenderId,
      });
      map.set(row.sessionId, picks);
    }

    return map;
  }

  private toSessionDto(
    session: SessionRecord,
    picks: PickDto[],
  ): SessionWithPickDto {
    const home = session.contenders.find((item) => item.role === 'home')?.contender ?? session.contenders[0]?.contender;
    const away = session.contenders.find((item) => item.role === 'away')?.contender ?? session.contenders[1]?.contender;
    const picksByCategory = new Map(picks.map((pick) => [pick.pickCategoryId, pick]));

    return {
      id: session.id,
      name: session.name,
      scheduledAt: formatFloatingIso(session.scheduledAt),
      status: session.status,
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
      picks: session.sessionCategories.map(({ pickCategory }) => ({
        pickCategoryId: pickCategory.id,
        name: pickCategory.name,
        label: pickCategory.label,
        valueType: pickCategory.valueType,
        value: picksByCategory.get(pickCategory.id)?.value ?? null,
        pickedContenderId: picksByCategory.get(pickCategory.id)?.pickedContenderId ?? null,
      })),
      hasUserPicks: picks.length > 0,
    };
  }
}
