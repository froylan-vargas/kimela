import { PhaseEntity } from '../../domain/phase.entity';
import { PhaseDto } from '../dtos/phase.dto';

export class PhaseMapper {
  static toDto(entity: PhaseEntity): PhaseDto {
    return {
      id: entity.id,
      name: entity.name,
      order: entity.order,
      type: entity.type,
      eventId: entity.eventId,
    };
  }

  static toDtoList(entities: PhaseEntity[]): PhaseDto[] {
    return entities.map((entity) => PhaseMapper.toDto(entity));
  }
}
