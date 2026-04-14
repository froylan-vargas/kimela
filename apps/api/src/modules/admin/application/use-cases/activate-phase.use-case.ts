import { Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';

export interface ActivatePhaseCommand {
  phaseId: string;
}

export interface ActivatePhaseResponse {
  data: PhaseDto;
}

@Injectable()
export class ActivatePhaseUseCase {
  private readonly logger = new Logger(ActivatePhaseUseCase.name);

  constructor(
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: ActivatePhaseCommand): Promise<ActivatePhaseResponse> {
    const { phaseId } = command;

    this.logger.log(`Activating phase ${phaseId}`);

    const phase = await this.phaseRepository.findById(phaseId);

    if (!phase) {
      throw new NotFoundException(`Phase ${phaseId} not found`);
    }

    if (phase.status !== 'UPCOMING') {
      throw new UnprocessableEntityException(
        `Phase ${phaseId} cannot be activated: current status is "${phase.status}"`,
      );
    }

    const updated = await this.phaseRepository.updateStatus(phaseId, 'ACTIVE');

    await this.prisma.qimela.updateMany({
      where: { startPhaseId: phaseId, status: 'UPCOMING' },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Phase ${phaseId} activated`);

    return { data: PhaseMapper.toDto(updated) };
  }
}
