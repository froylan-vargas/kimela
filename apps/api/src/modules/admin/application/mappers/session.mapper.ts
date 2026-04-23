import { SessionEntity } from '../../domain/session.entity';
import { SessionDto } from '../dtos/session.dto';

export class SessionMapper {
  static toDto(entity: SessionEntity): SessionDto {
    return {
      id: entity.id,
      name: entity.name,
      scheduledAt: entity.scheduledAt.toISOString(),
      status: entity.status,
      home: {
        id: entity.home.id,
        name: entity.home.name,
        imgUrl: entity.home.imgUrl,
      },
      away: {
        id: entity.away.id,
        name: entity.away.name,
        imgUrl: entity.away.imgUrl,
      },
      score: {
        home: entity.score.home,
        away: entity.score.away,
      },
    };
  }

  static toDtoList(entities: SessionEntity[]): SessionDto[] {
    return entities.map((entity) => SessionMapper.toDto(entity));
  }
}
