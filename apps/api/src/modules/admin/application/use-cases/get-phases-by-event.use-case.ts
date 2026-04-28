import { Inject, Injectable } from '@nestjs/common';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface GetPhasesByEventQuery {
  eventId: string;
}

export interface GetPhasesByEventResponse {
  data: PhaseDto[];
}

@Injectable()
export class GetPhasesByEventUseCase {

  constructor(
    @InjectPinoLogger(GetPhasesByEventUseCase.name) private readonly logger: PinoLogger,
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
  ) {}

  async execute(query: GetPhasesByEventQuery): Promise<GetPhasesByEventResponse> {
    this.logger.info(`Fetching phases for event ${query.eventId}`);

    const phases = await this.phaseRepository.findByEvent({ eventId: query.eventId });
    const data: PhaseDto[] = PhaseMapper.toDtoList(phases);

    this.logger.info(`Found ${data.length} phases for event ${query.eventId}`);

    return { data };
  }
}
