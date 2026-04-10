import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { SportEntity } from '../../domain/sport.entity';
import { SportRepository } from '../../domain/sport.repository';
import { SportPersistenceMapper } from './sport-persistence.mapper';

@Injectable()
export class PrismaSportRepository implements SportRepository {
  private readonly logger = new Logger(PrismaSportRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SportEntity[]> {
    this.logger.debug('Finding all sports ordered by name');

    const records = await this.prisma.sport.findMany({
      orderBy: { name: 'asc' },
    });

    return records.map((record) => SportPersistenceMapper.toDomain(record));
  }
}
