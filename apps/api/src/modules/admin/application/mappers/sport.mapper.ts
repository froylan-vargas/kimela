import { SportEntity } from '../../domain/sport.entity';
import { SportDto } from '../dtos/sport.dto';

export class SportMapper {
  static toDto(entity: SportEntity): SportDto {
    return {
      id: entity.id,
      name: entity.name,
      imgUrl: entity.imgUrl,
      sessionFormat: entity.sessionFormat,
    };
  }

  static toDtoList(entities: SportEntity[]): SportDto[] {
    return entities.map((entity) => SportMapper.toDto(entity));
  }
}
