import { Inject, Injectable, Logger } from '@nestjs/common';
import { EVENT_REPOSITORY, EventRepository } from '../../domain/event.repository';
import { EventDto } from '../dtos/event.dto';
import { EventMapper } from '../mappers/event.mapper';

export interface GetActiveEventsBySportQuery {
  sportId: string;
}

export interface GetActiveEventsBySportResponse {
  data: EventDto[];
}

@Injectable()
export class GetActiveEventsBySportUseCase {
  private readonly logger = new Logger(GetActiveEventsBySportUseCase.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(query: GetActiveEventsBySportQuery): Promise<GetActiveEventsBySportResponse> {
    this.logger.log(`Fetching active events for sport ${query.sportId}`);

    const events = await this.eventRepository.findActiveBySport({ sportId: query.sportId });
    const data: EventDto[] = EventMapper.toDtoList(events);

    this.logger.log(`Found ${data.length} active events for sport ${query.sportId}`);

    return { data };
  }
}
