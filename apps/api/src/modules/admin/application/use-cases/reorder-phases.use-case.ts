import { Inject, Injectable, Logger } from '@nestjs/common';
import { PHASE_REPOSITORY, PhaseRepository, ReorderPhaseItem } from '../../domain/phase.repository';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';

export interface ReorderPhasesCommand {
  phases: ReorderPhaseItem[];
}

export interface ReorderPhasesResponse {
  data: PhaseDto[];
}

@Injectable()
export class ReorderPhasesUseCase {
  private readonly logger = new Logger(ReorderPhasesUseCase.name);

  constructor(
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
  ) {}

  async execute(command: ReorderPhasesCommand): Promise<ReorderPhasesResponse> {
    this.logger.log(`Reordering ${command.phases.length} phases`);

    const phases = await this.phaseRepository.reorder(command.phases);
    const data: PhaseDto[] = PhaseMapper.toDtoList(phases);

    this.logger.log(`Reorder completed for ${data.length} phases`);

    return { data };
  }
}
