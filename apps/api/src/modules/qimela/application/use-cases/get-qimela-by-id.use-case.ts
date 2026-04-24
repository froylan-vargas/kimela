import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';

export interface GetQimelaByIdPhase {
  id: string;
  name: string;
  order: number;
  status: string;
}

export interface GetQimelaByIdRule {
  id: string;
  ruleId: string;
  slug: string;
  question: string;
  points: number;
  minPoints: number;
  maxPoints: number;
}

export interface GetQimelaByIdResponse {
  data: {
    id: string;
    name: string;
    sportId: string;
    status: string;
    creatorId: string;
    eventId: string | null;
    leagueId: string | null;
    startPhaseId: string | null;
    endPhaseId: string | null;
    isSubscribed: boolean;
    phases: GetQimelaByIdPhase[];
    rules: GetQimelaByIdRule[];
  };
}

@Injectable()
export class GetQimelaByIdUseCase {
  private readonly logger = new Logger(GetQimelaByIdUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string, userId: string): Promise<GetQimelaByIdResponse> {
    this.logger.log(`Getting qimela by id ${id}`);

    const qimela = await this.qimelaRepository.findById(id);
    if (!qimela) {
      throw new NotFoundException(`Qimela ${id} not found`);
    }

    // Fetch event phases, qimela rules, and subscription status in parallel
    const [phases, qimelaRules, subscription] = await Promise.all([
      qimela.eventId
        ? this.prisma.phase.findMany({
            where: { eventId: qimela.eventId },
            select: { id: true, name: true, order: true, status: true },
            orderBy: { order: 'asc' },
          })
        : Promise.resolve([]),
      this.prisma.qimelaRule.findMany({
        where: { qimelaId: id },
        include: { rule: true },
      }),
      this.prisma.subscription.findFirst({
        where: { qimelaId: id, userId },
        select: { id: true },
      }),
    ]);

    return {
      data: {
        id: qimela.id,
        name: qimela.name,
        sportId: qimela.sportId,
        status: qimela.status,
        creatorId: qimela.creatorId,
        eventId: qimela.eventId,
        leagueId: qimela.leagueId,
        startPhaseId: qimela.startPhaseId,
        endPhaseId: qimela.endPhaseId,
        isSubscribed: subscription !== null,
        phases: phases.map((p) => ({
          id: p.id,
          name: p.name,
          order: p.order,
          status: p.status,
        })),
        rules: qimelaRules.map((qr) => ({
          id: qr.id,
          ruleId: qr.rule.id,
          slug: qr.rule.slug,
          question: qr.rule.question,
          points: qr.points,
          minPoints: qr.rule.minPoints,
          maxPoints: qr.rule.maxPoints,
        })),
      },
    };
  }
}
