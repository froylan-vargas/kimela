import { Inject, Injectable } from '@nestjs/common';
import { PHASE_REPOSITORY, PhaseRepository, ReorderPhaseItem } from '../../domain/phase.repository';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface ReorderPhasesCommand {
  phases: ReorderPhaseItem[];
}

export interface ReorderPhasesResponse {
  data: PhaseDto[];
}

@Injectable()
export class ReorderPhasesUseCase {

  constructor(
    @InjectPinoLogger(ReorderPhasesUseCase.name) private readonly logger: PinoLogger,
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
  ) {}

  async execute(command: ReorderPhasesCommand): Promise<ReorderPhasesResponse> {
    this.logger.info(`Reordering ${command.phases.length} phases`);

    const phases = await this.phaseRepository.reorder(command.phases);
    const data: PhaseDto[] = PhaseMapper.toDtoList(phases);

    this.logger.info(`Reorder completed for ${data.length} phases`);

    return { data };
  }
}
