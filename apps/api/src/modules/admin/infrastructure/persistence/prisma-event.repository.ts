import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { EventEntity } from '../../domain/event.entity';
import { EventRepository, FindActiveBySportOptions } from '../../domain/event.repository';
import { EventPersistenceMapper } from './event-persistence.mapper';

@Injectable()
export class PrismaEventRepository implements EventRepository {
  private readonly logger = new Logger(PrismaEventRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findActiveBySport(options: FindActiveBySportOptions): Promise<EventEntity[]> {
    const { sportId } = options;

    this.logger.debug(`Finding active events for sport ${sportId}`);

    const records = await this.prisma.event.findMany({
      where: {
        status: {
          in: ['UPCOMING', 'ACTIVE'],
        },
        league: { sportId },
      },
      include: {
        league: {
          select: { name: true },
        },
      },
    });

    return records.map((record) => EventPersistenceMapper.toDomain(record));
  }
}
