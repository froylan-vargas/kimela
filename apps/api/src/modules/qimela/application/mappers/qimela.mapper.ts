import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaDto } from '../dtos/qimela.dto';

export class QimelaMapper {
  static toDto(entity: QimelaEntity, userId: string): QimelaDto {
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

  static toDtoList(entities: QimelaEntity[], userId: string): QimelaDto[] {
    return entities.map((entity) => QimelaMapper.toDto(entity, userId));
  }
}
