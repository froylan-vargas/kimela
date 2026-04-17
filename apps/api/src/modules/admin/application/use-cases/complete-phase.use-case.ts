import { Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';

export interface CompletePhaseCommand {
  phaseId: string;
}

export interface CompletePhaseResponse {
  data: PhaseDto;
}

@Injectable()
export class CompletePhaseUseCase {
  private readonly logger = new Logger(CompletePhaseUseCase.name);

  constructor(
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CompletePhaseCommand): Promise<CompletePhaseResponse> {
    const { phaseId } = command;

    this.logger.log(`Completing phase ${phaseId}`);

    const phase = await this.phaseRepository.findById(phaseId);

    if (!phase) {
      throw new NotFoundException(`Phase ${phaseId} not found`);
    }

    if (phase.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `La fase ${phaseId} no puede completarse: el estado actual es "${phase.status}"`,
      );
    }

    const blockingSessionCount = await this.prisma.session.count({
      where: { phaseId, status: { in: ['SCHEDULED', 'LIVE'] } },
    });

    if (blockingSessionCount > 0) {
      throw new UnprocessableEntityException('La fase tiene sesiones que aún están activas');
    }

    const updated = await this.phaseRepository.updateStatus(phaseId, 'COMPLETED');

    await this.prisma.qimela.updateMany({
      where: { endPhaseId: phaseId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    });

    this.logger.log(`Phase ${phaseId} completed`);

    return { data: PhaseMapper.toDto(updated) };
  }
}
