import { Sport as PrismaSport } from '@prisma/client';
import { SportEntity } from '../../domain/sport.entity';

export class SportPersistenceMapper {
  static toDomain(raw: PrismaSport): SportEntity {
    return new SportEntity({
      id: raw.id,
      name: raw.name,
      imgUrl: raw.imgUrl,
      sessionFormat: raw.sessionFormat,
    });
  }
}
