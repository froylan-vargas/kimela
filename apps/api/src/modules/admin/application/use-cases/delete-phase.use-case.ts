import { Inject, Injectable, Logger } from '@nestjs/common';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';

export interface DeletePhaseCommand {
  id: string;
}

@Injectable()
export class DeletePhaseUseCase {
  private readonly logger = new Logger(DeletePhaseUseCase.name);

  constructor(
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
  ) {}

  async execute(command: DeletePhaseCommand): Promise<void> {
    this.logger.log(`Deleting phase ${command.id}`);
    await this.phaseRepository.delete(command.id);
  }
}
