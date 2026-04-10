import { Inject, Injectable, Logger } from '@nestjs/common';
import { PHASE_REPOSITORY, PhaseRepository } from '../../domain/phase.repository';
import { PhaseDto } from '../dtos/phase.dto';
import { PhaseMapper } from '../mappers/phase.mapper';

export interface GetPhasesByEventQuery {
  eventId: string;
}

export interface GetPhasesByEventResponse {
  data: PhaseDto[];
}

@Injectable()
export class GetPhasesByEventUseCase {
  private readonly logger = new Logger(GetPhasesByEventUseCase.name);

  constructor(
    @Inject(PHASE_REPOSITORY)
    private readonly phaseRepository: PhaseRepository,
  ) {}

  async execute(query: GetPhasesByEventQuery): Promise<GetPhasesByEventResponse> {
    this.logger.log(`Fetching phases for event ${query.eventId}`);

    const phases = await this.phaseRepository.findByEvent({ eventId: query.eventId });
    const data: PhaseDto[] = PhaseMapper.toDtoList(phases);

    this.logger.log(`Found ${data.length} phases for event ${query.eventId}`);

    return { data };
  }
}
