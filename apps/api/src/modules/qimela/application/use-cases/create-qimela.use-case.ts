import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { RULE_REPOSITORY, RuleRepository } from '../../domain/rule.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface CreateQimelaCommand {
  creatorId: string;
  name: string;
  sportId: string;
  eventId: string;
  leagueId: string;
  initialPhaseId: string;
  finalPhaseId: string;
  rules: { ruleId: string; points: number }[];
}

export interface CreateQimelaResponse {
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
  };
}

@Injectable()
export class CreateQimelaUseCase {

  constructor(
    @InjectPinoLogger(CreateQimelaUseCase.name) private readonly logger: PinoLogger,
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    @Inject(RULE_REPOSITORY)
    private readonly ruleRepository: RuleRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CreateQimelaCommand): Promise<CreateQimelaResponse> {
    this.logger.info(`Creating qimela "${command.name}" for user ${command.creatorId}`);

    const submittedRuleIds = command.rules.map((r) => r.ruleId);
    const foundRules = await this.ruleRepository.findByIds(submittedRuleIds);

    const missingId = submittedRuleIds.find((id) => !foundRules.some((r) => r.id === id));
    if (missingId) {
      throw new NotFoundException(`Rule ${missingId} not found`);
    }

    for (const submitted of command.rules) {
      const rule = foundRules.find((r) => r.id === submitted.ruleId)!;
      if (submitted.points < rule.minPoints) {
        throw new UnprocessableEntityException({
          code: 'RULE_BELOW_MIN_POINTS',
          message: `Rule "${rule.slug}" requires at least ${rule.minPoints} point(s).`,
        });
      }
      if (submitted.points > rule.maxPoints) {
        throw new UnprocessableEntityException({
          code: 'RULE_ABOVE_MAX_POINTS',
          message: `Rule "${rule.slug}" allows at most ${rule.maxPoints} point(s).`,
        });
      }
    }

    const [initialPhase, finalPhase] = await Promise.all([
      this.prisma.phase.findUnique({
        where: { id: command.initialPhaseId },
        select: { id: true, eventId: true, order: true, status: true },
      }),
      this.prisma.phase.findUnique({
        where: { id: command.finalPhaseId },
        select: { id: true, eventId: true, order: true, status: true },
      }),
    ]);

    if (!initialPhase || initialPhase.eventId !== command.eventId) {
      throw new UnprocessableEntityException(
        'La fase inicial no pertenece al evento seleccionado.',
      );
    }

    if (!finalPhase || finalPhase.eventId !== command.eventId) {
      throw new UnprocessableEntityException(
        'La fase final no pertenece al evento seleccionado.',
      );
    }

    if (initialPhase.status === 'ACTIVE') {
      throw new UnprocessableEntityException(
        'La fase inicial no puede estar en curso.',
      );
    }

    if (finalPhase.status === 'ACTIVE') {
      throw new UnprocessableEntityException(
        'La fase final no puede estar en curso.',
      );
    }

    if (initialPhase.order > finalPhase.order) {
      throw new UnprocessableEntityException(
        'La fase inicial debe tener un orden menor o igual a la fase final.',
      );
    }

    const initialStatus = QimelaStatus.UPCOMING;

    const entity = QimelaEntity.create({
      name: command.name,
      sportId: command.sportId,
      creatorId: command.creatorId,
      eventId: command.eventId,
      leagueId: command.leagueId,
      startPhaseId: command.initialPhaseId,
      endPhaseId: command.finalPhaseId,
      rules: command.rules,
      status: initialStatus,
    });

    const saved = await this.qimelaRepository.save(entity);

    return {
      data: {
        id: saved.id,
        name: saved.name,
        sportId: saved.sportId,
        status: saved.status,
        creatorId: saved.creatorId,
        eventId: saved.eventId,
        leagueId: saved.leagueId,
        startPhaseId: saved.startPhaseId,
        endPhaseId: saved.endPhaseId,
      },
    };
  }
}
