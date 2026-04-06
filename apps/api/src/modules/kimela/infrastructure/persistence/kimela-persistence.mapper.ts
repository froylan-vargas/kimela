import { Kimela as PrismaKimela, KimelaStatus as PrismaKimelaStatus } from '@prisma/client';
import { KimelaEntity } from '../../domain/kimela.entity';
import { KimelaStatus } from '../../domain/kimela-status.enum';

export class KimelaPersistenceMapper {
  static toDomain(raw: PrismaKimela): KimelaEntity {
    return new KimelaEntity({
      id: raw.id,
      name: raw.name,
      description: raw.description,
      sport: raw.sport,
      status: KimelaPersistenceMapper.toDomainStatus(raw.status),
      creatorId: raw.creatorId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPrismaStatus(status: KimelaStatus): PrismaKimelaStatus {
    return status as unknown as PrismaKimelaStatus;
  }

  private static toDomainStatus(status: PrismaKimelaStatus): KimelaStatus {
    return status as unknown as KimelaStatus;
  }
}
