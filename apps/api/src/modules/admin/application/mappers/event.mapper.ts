import { EventEntity } from '../../domain/event.entity';
import { EventDto } from '../dtos/event.dto';

export class EventMapper {
  static toDto(entity: EventEntity): EventDto {
    return {
      id: entity.id,
      name: entity.name,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      status: entity.status,
      leagueId: entity.leagueId,
      leagueName: entity.leagueName,
    };
  }

  static toDtoList(entities: EventEntity[]): EventDto[] {
    return entities.map((entity) => EventMapper.toDto(entity));
  }
}
