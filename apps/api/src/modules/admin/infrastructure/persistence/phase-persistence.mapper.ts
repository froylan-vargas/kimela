import { Phase as PrismaPhase } from '@prisma/client';
import { PhaseEntity, PhaseStatus, PhaseType } from '../../domain/phase.entity';

export class PhasePersistenceMapper {
  static toDomain(raw: PrismaPhase): PhaseEntity {
    return new PhaseEntity({
      id: raw.id,
      name: raw.name,
      order: raw.order,
      type: raw.type as PhaseType,
      status: raw.status as PhaseStatus,
      eventId: raw.eventId,
    });
  }
}
