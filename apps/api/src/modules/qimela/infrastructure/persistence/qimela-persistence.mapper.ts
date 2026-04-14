import { Qimela as PrismaQimela, QimelaStatus as PrismaQimelaStatus, CoveredStages as PrismaCoveredStages } from '@prisma/client';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { CoveredStages } from '../../domain/covered-stages.enum';

export class QimelaPersistenceMapper {
  static toDomain(raw: PrismaQimela): QimelaEntity {
    return new QimelaEntity({
      id: raw.id,
      name: raw.name,
      status: QimelaPersistenceMapper.toDomainStatus(raw.status),
      sportId: raw.sportId,
      eventId: raw.eventId,
      leagueId: raw.leagueId ?? null,
      creatorId: raw.creatorId,
      rules: [],
      coveredStages: raw.coveredStages as unknown as CoveredStages,
      startPhaseId: raw.startPhaseId ?? null,
      endPhaseId: raw.endPhaseId ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPrismaStatus(status: QimelaStatus): PrismaQimelaStatus {
    return status as unknown as PrismaQimelaStatus;
  }

  static toPrismaCoveredStages(coveredStages: CoveredStages): PrismaCoveredStages {
    return coveredStages as unknown as PrismaCoveredStages;
  }

  private static toDomainStatus(status: PrismaQimelaStatus): QimelaStatus {
    return status as unknown as QimelaStatus;
  }
}
