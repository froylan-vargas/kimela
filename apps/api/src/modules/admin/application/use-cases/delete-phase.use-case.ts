import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface DeletePhaseCommand {
  id: string;
}

@Injectable()
export class DeletePhaseUseCase {

  constructor(
    @InjectPinoLogger(DeletePhaseUseCase.name) private readonly logger: PinoLogger,
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
  ) {}

  async execute(command: DeletePhaseCommand): Promise<void> {
    this.logger.info(`Deleting phase ${command.id}`);

    const phase = await this.phaseRepository.findById(command.id);

    if (!phase) {
      throw new NotFoundException(`Phase ${command.id} not found`);
    }

    if (phase.status !== 'UPCOMING') {
      throw new UnprocessableEntityException(
        `La fase ${command.id} no puede eliminarse: el estado actual es "${phase.status}"`,
      );
    }

    await this.phaseRepository.delete(command.id);
  }
}
