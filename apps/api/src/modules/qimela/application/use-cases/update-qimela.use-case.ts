import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PhaseType, SessionStatus, EventStatus } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QimelaPatch, QIMELA_REPOSITORY, QimelaRepository } from '../../domain/qimela.repository';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { CoveredStages } from '../../domain/covered-stages.enum';

export interface UpdateQimelaCommand {
  id: string;
  requesterId: string;
  name?: string;
  coveredStages?: CoveredStages;
}

export interface UpdateQimelaResponse {
  data: {
    id: string;
    name: string;
    status: string;
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
export class UpdateQimelaUseCase {
  private readonly logger = new Logger(UpdateQimelaUseCase.name);

  constructor(
    @Inject(QIMELA_REPOSITORY)
    private readonly qimelaRepository: QimelaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: UpdateQimelaCommand): Promise<UpdateQimelaResponse> {
    this.logger.log(`Updating qimela ${command.id} requested by user ${command.requesterId}`);

    const qimela = await this.qimelaRepository.findById(command.id);
    if (!qimela) {
      throw new NotFoundException(`Qimela ${command.id} not found`);
    }

    if (!qimela.isCreatedBy(command.requesterId)) {
      throw new ForbiddenException('Only the creator can edit this qimela');
    }

    if (qimela.status === QimelaStatus.COMPLETED) {
      throw new UnprocessableEntityException('Cannot edit a completed qimela');
    }

    const patch: QimelaPatch = {};

    if (command.name !== undefined) {
      patch.name = command.name;
    }

    if (command.coveredStages !== undefined && command.coveredStages !== qimela.coveredStages) {
      if (qimela.status === QimelaStatus.UPCOMING) {
        const { startPhaseId, endPhaseId } = await this.resolvePhases(
          qimela.eventId!,
          command.coveredStages,
        );
        patch.coveredStages = command.coveredStages;
        patch.startPhaseId = startPhaseId;
        patch.endPhaseId = endPhaseId;
      } else if (qimela.status === QimelaStatus.ACTIVE) {
        const isRegularSeasonToFull =
          qimela.coveredStages === CoveredStages.REGULAR_SEASON &&
          command.coveredStages === CoveredStages.FULL;

        if (!isRegularSeasonToFull) {
          throw new UnprocessableEntityException(
            'Only REGULAR_SEASON to FULL is allowed while qimela is active',
          );
        }

        const lastPlayoffPhase = await this.prisma.phase.findFirst({
          where: { eventId: qimela.eventId!, type: PhaseType.PLAYOFFS },
          orderBy: { order: 'desc' },
        });

        if (!lastPlayoffPhase) {
          throw new UnprocessableEntityException('No playoff phases found for this event');
        }

        patch.coveredStages = command.coveredStages;
        patch.endPhaseId = lastPlayoffPhase.id;
      }
    }

    if (Object.keys(patch).length === 0) {
      return {
        data: {
          id: qimela.id,
          name: qimela.name,
          status: qimela.status,
          coveredStages: qimela.coveredStages,
          startPhaseId: qimela.startPhaseId,
          endPhaseId: qimela.endPhaseId,
        },
      };
    }

    const updated = await this.qimelaRepository.update(command.id, patch);

    return {
      data: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        coveredStages: updated.coveredStages,
        startPhaseId: updated.startPhaseId,
        endPhaseId: updated.endPhaseId,
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

    const currentPhase = this.findCurrentPhase(event.phases as PhaseWithSessions[]);

    return this.resolveActivePhaseBounds(coveredStages, eligiblePhases, currentPhase);
  }

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
      throw new UnprocessableEntityException(
        `Cannot update qimela for "${coveredStages}": no future sessions available in this event.`,
      );
    }

    if (coveredStages === CoveredStages.REGULAR_SEASON) {
      const startPhase = eligiblePhases.find((p) => p.order > currentPhase.order);
      if (!startPhase) {
        throw new UnprocessableEntityException(
          'Cannot update qimela for REGULAR_SEASON: the regular season is already over.',
        );
      }
      return { startPhaseId: startPhase.id, endPhaseId: endPhase.id };
    }

    if (coveredStages === CoveredStages.PLAYOFFS) {
      const startPhase = eligiblePhases.find((p) => {
        if (p.order > currentPhase.order) return true;
        if (p.order === currentPhase.order) return true;
        const allDone = p.sessions.every(
          (s) => s.status === SessionStatus.COMPLETED || s.status === SessionStatus.CANCELLED,
        );
        return !allDone;
      });
      if (!startPhase) {
        throw new UnprocessableEntityException(
          'Cannot update qimela for PLAYOFFS: all playoff phases are already completed.',
        );
      }
      return { startPhaseId: startPhase.id, endPhaseId: endPhase.id };
    }

    // FULL
    const startPhase = eligiblePhases.find((p) => p.order > currentPhase.order);
    if (!startPhase) {
      throw new UnprocessableEntityException(
        'Cannot update qimela for FULL: no covered phases remain after the current phase.',
      );
    }
    return { startPhaseId: startPhase.id, endPhaseId: endPhase.id };
  }
}
