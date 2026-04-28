import { Inject, Injectable } from '@nestjs/common';
import { EVENT_REPOSITORY, EventRepository } from '../../domain/event.repository';
import { EventDto } from '../dtos/event.dto';
import { EventMapper } from '../mappers/event.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface GetActiveEventsBySportQuery {
  sportId: string;
}

export interface GetActiveEventsBySportResponse {
  data: EventDto[];
}

@Injectable()
export class GetActiveEventsBySportUseCase {

  constructor(
    @InjectPinoLogger(GetActiveEventsBySportUseCase.name) private readonly logger: PinoLogger,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(query: GetActiveEventsBySportQuery): Promise<GetActiveEventsBySportResponse> {
    this.logger.info(`Fetching active events for sport ${query.sportId}`);

    const events = await this.eventRepository.findActiveBySport({ sportId: query.sportId });
    const data: EventDto[] = EventMapper.toDtoList(events);

    this.logger.info(`Found ${data.length} active events for sport ${query.sportId}`);

    return { data };
  }
}
