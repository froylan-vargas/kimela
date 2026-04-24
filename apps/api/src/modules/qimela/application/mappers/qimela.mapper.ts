import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaDto, QimelaRole } from '../dtos/qimela.dto';

export class QimelaMapper {
  static toDto(entity: QimelaEntity, userId: string, role?: QimelaRole): QimelaDto {
    return {
      id: entity.id,
      name: entity.name,
      sportId: entity.sportId,
      status: entity.status,
      role: role ?? (entity.isCreatedBy(userId) ? 'CREATOR' : 'SUBSCRIBER'),
      creatorId: entity.creatorId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toDtoList(entities: QimelaEntity[], userId: string): QimelaDto[] {
    return entities.map((entity) => QimelaMapper.toDto(entity, userId));
  }
}
