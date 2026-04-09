import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QimelaEntity } from '../../domain/qimela.entity';
import { FindForUserOptions, QimelaRepository } from '../../domain/qimela.repository';
import { QimelaPersistenceMapper } from './qimela-persistence.mapper';

@Injectable()
export class PrismaQimelaRepository implements QimelaRepository {
  private readonly logger = new Logger(PrismaQimelaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findForUser(options: FindForUserOptions): Promise<QimelaEntity[]> {
    const { userId, status } = options;

    this.logger.debug(`Finding qimelas for user ${userId}`, { status });

    const statusFilter = status
      ? { status: QimelaPersistenceMapper.toPrismaStatus(status) }
      : {};

    const records = await this.prisma.qimela.findMany({
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

    return records.map((record) => QimelaPersistenceMapper.toDomain(record));
  }
}
