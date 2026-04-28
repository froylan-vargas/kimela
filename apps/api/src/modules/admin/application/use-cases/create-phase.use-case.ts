import { Inject, Injectable } from '@nestjs/common';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';
import { PhaseType } from '../../domain/phase.entity';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface CreatePhaseCommand {
  eventId: string;
  name: string;
  type: PhaseType;
}

export interface CreatePhaseResponse {
  data: PhaseDto;
}

@Injectable()
export class CreatePhaseUseCase {

  constructor(
    @InjectPinoLogger(CreatePhaseUseCase.name) private readonly logger: PinoLogger,
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
  ) {}

  async execute(command: CreatePhaseCommand): Promise<CreatePhaseResponse> {
    this.logger.info(`Creating phase "${command.name}" for event ${command.eventId}`);

    const maxOrder = await this.phaseRepository.getMaxOrderForEvent(command.eventId);
    const nextOrder = maxOrder + 1;

    const phase = await this.phaseRepository.create({
      eventId: command.eventId,
      name: command.name,
      type: command.type,
    });

    this.logger.info(`Phase created with id ${phase.id} at order ${nextOrder}`);

    return { data: PhaseMapper.toDto(phase) };
  }
}
