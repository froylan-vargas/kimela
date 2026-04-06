import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { KimelaEntity } from '../../domain/kimela.entity';
import { FindForUserOptions, KimelaRepository } from '../../domain/kimela.repository';
import { KimelaPersistenceMapper } from './kimela-persistence.mapper';

@Injectable()
export class PrismaKimelaRepository implements KimelaRepository {
  private readonly logger = new Logger(PrismaKimelaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findForUser(options: FindForUserOptions): Promise<KimelaEntity[]> {
    const { userId, status } = options;

    this.logger.debug(`Finding kimelas for user ${userId}`, { status });

    const statusFilter = status
      ? { status: KimelaPersistenceMapper.toPrismaStatus(status) }
      : {};

    const records = await this.prisma.kimela.findMany({
      where: {
        AND: [
          statusFilter,
          {
            OR: [
              { creatorId: userId },
              {
                subscriptions: {
                  some: { userId },
                },
              },
            ],
          },
        ],
      },
    });

    return records.map((record) => KimelaPersistenceMapper.toDomain(record));
  }
}
