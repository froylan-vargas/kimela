import { Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PhaseType, SessionStatus, EventStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { RULE_REPOSITORY, RuleRepository } from '../../domain/rule.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { CoveredStages } from '../../domain/covered-stages.enum';

export interface CreateQimelaCommand {
  creatorId: string;
  name: string;
  sportId: string;
  eventId: string;
  leagueId: string;
  coveredStages: CoveredStages;
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
    coveredStages: CoveredStages;
    startPhaseId: string | null;
    endPhaseId: string | null;
  };
}

type PhaseWithSessions = {
  id: string;
  name: string;
  order: number;
  type: PhaseType;
  sessions: { status: SessionStatus }[];
};

@Injectable()
export class CreateQimelaUseCase {
  private readonly logger = new Logger(CreateQimelaUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    @Inject(RULE_REPOSITORY)
    private readonly ruleRepository: RuleRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CreateQimelaCommand): Promise<CreateQimelaResponse> {
    this.logger.log(`Creating qimela "${command.name}" for user ${command.creatorId}`);

    const submittedRuleIds = command.rules.map((r) => r.ruleId);
    const foundRules = await this.ruleRepository.findByIds(submittedRuleIds);

    const missingId = submittedRuleIds.find((id) => !foundRules.some((r) => r.id === id));
    if (missingId) {
      throw new NotFoundException(`Rule ${missingId} not found`);
    }

    for (const submitted of command.rules) {
      const rule = foundRules.find((r) => r.id === submitted.ruleId)!;
      if (submitted.points < rule.minPoints) {
        throw new UnprocessableEntityException(
          `Rule "${rule.slug}" requires at least ${rule.minPoints} point(s).`,
        );
      }
      if (submitted.points > rule.maxPoints) {
        throw new UnprocessableEntityException(
          `Rule "${rule.slug}" allows at most ${rule.maxPoints} point(s).`,
        );
      }
    }

    const { startPhaseId, endPhaseId } = await this.resolvePhases(
      command.eventId,
      command.coveredStages,
    );

    let initialStatus = QimelaStatus.UPCOMING;

    if (startPhaseId) {
      const startPhase = await this.prisma.phase.findUnique({
        where: { id: startPhaseId },
        select: { status: true },
      });

      if (startPhase?.status === 'ACTIVE') {
        initialStatus = QimelaStatus.ACTIVE;
      }
    }

    const entity = QimelaEntity.create({
      name: command.name,
      sportId: command.sportId,
      creatorId: command.creatorId,
      eventId: command.eventId,
      leagueId: command.leagueId,
      coveredStages: command.coveredStages,
      startPhaseId,
      endPhaseId,
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
        coveredStages: saved.coveredStages,
        startPhaseId: saved.startPhaseId,
        endPhaseId: saved.endPhaseId,
      },
    };
  }

  private async resolvePhases(
    eventId: string,
    coveredStages: CoveredStages,
  ): Promise<{ startPhaseId: string | null; endPhaseId: string | null }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        phases: {
          orderBy: { order: 'asc' },
          include: {
            sessions: { select: { status: true, scheduledAt: true } },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const coveredPhaseTypes = this.getCoveredPhaseTypes(coveredStages);

    const eligiblePhases = (event.phases as PhaseWithSessions[]).filter((p) =>
      coveredPhaseTypes.includes(p.type),
    );

    if (eligiblePhases.length === 0) {
      throw new UnprocessableEntityException(
        `No phases of type "${coveredStages}" exist for this event.`,
      );
    }

    const eventStatus = event.status as EventStatus;

    if (eventStatus === EventStatus.UPCOMING) {
      return {
        startPhaseId: eligiblePhases[0].id,
        endPhaseId: eligiblePhases[eligiblePhases.length - 1].id,
      };
    }

    // ACTIVE event: determine currentPhase
    const currentPhase = this.findCurrentPhase(event.phases as PhaseWithSessions[]);

    return this.resolveActivePhaseBounds(
      coveredStages,
      eligiblePhases,
      currentPhase,
    );
  }

  /**
   * Current phase = lowest-order phase with at least one SCHEDULED session.
   * Returns null when no such phase exists (all sessions are done or no sessions yet).
   */
  private findCurrentPhase(phases: PhaseWithSessions[]): PhaseWithSessions | null {
    return (
      phases.find((p) => p.sessions.some((s) => s.status === SessionStatus.SCHEDULED)) ?? null
    );
  }

  private getCoveredPhaseTypes(coveredStages: CoveredStages): PhaseType[] {
    switch (coveredStages) {
      case CoveredStages.REGULAR_SEASON:
        return [PhaseType.REGULAR_SEASON];
      case CoveredStages.PLAYOFFS:
        return [PhaseType.PLAYOFFS];
      case CoveredStages.FULL:
        return [PhaseType.REGULAR_SEASON, PhaseType.PLAYOFFS];
    }
  }

  private resolveActivePhaseBounds(
    coveredStages: CoveredStages,
    eligiblePhases: PhaseWithSessions[],
    currentPhase: PhaseWithSessions | null,
  ): { startPhaseId: string; endPhaseId: string } {
    const endPhase = eligiblePhases[eligiblePhases.length - 1];

    if (!currentPhase) {
      // No scheduled sessions left — all phases are completed
      throw new UnprocessableEntityException(
        `Cannot create a qimela for "${coveredStages}": no future sessions available in this event.`,
      );
    }

    if (coveredStages === CoveredStages.REGULAR_SEASON) {
      // Start = first REGULAR_SEASON phase with order strictly after currentPhase
      const startPhase = eligiblePhases.find((p) => p.order > currentPhase.order);
      if (!startPhase) {
        throw new UnprocessableEntityException(
          'Cannot create a qimela for REGULAR_SEASON: the regular season is already over.',
        );
      }
      return { startPhaseId: startPhase.id, endPhaseId: endPhase.id };
    }

    if (coveredStages === CoveredStages.PLAYOFFS) {
      // Start = first PLAYOFFS phase with order >= currentPhase.order (not fully completed)
      const startPhase = eligiblePhases.find((p) => {
        if (p.order > currentPhase.order) return true;
        if (p.order === currentPhase.order) return true;
        // order < currentPhase.order: check if all sessions are done
        const allDone = p.sessions.every(
          (s) => s.status === SessionStatus.COMPLETED || s.status === SessionStatus.CANCELLED,
        );
        return !allDone;
      });
      if (!startPhase) {
        throw new UnprocessableEntityException(
          'Cannot create a qimela for PLAYOFFS: all playoff phases are already completed.',
        );
      }
      return { startPhaseId: startPhase.id, endPhaseId: endPhase.id };
    }

    // FULL: start = first eligible phase with order strictly after currentPhase
    const startPhase = eligiblePhases.find((p) => p.order > currentPhase.order);
    if (!startPhase) {
      throw new UnprocessableEntityException(
        'Cannot create a qimela for FULL: no covered phases remain after the current phase.',
      );
    }
    return { startPhaseId: startPhase.id, endPhaseId: endPhase.id };
  }
}
