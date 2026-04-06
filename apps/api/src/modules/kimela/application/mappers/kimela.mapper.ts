import { KimelaEntity } from '../../domain/kimela.entity';
import { KimelaDto } from '../dtos/kimela.dto';

export class KimelaMapper {
  static toDto(entity: KimelaEntity, userId: string): KimelaDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      sport: entity.sport,
      status: entity.status,
      role: entity.isCreatedBy(userId) ? 'CREATOR' : 'SUBSCRIBER',
      creatorId: entity.creatorId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toDtoList(entities: KimelaEntity[], userId: string): KimelaDto[] {
    return entities.map((entity) => KimelaMapper.toDto(entity, userId));
  }
}
