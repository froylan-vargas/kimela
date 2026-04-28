import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { EventEntity } from '../../domain/event.entity';
import { EventRepository, FindActiveBySportOptions } from '../../domain/event.repository';
import { EventPersistenceMapper } from './event-persistence.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaEventRepository implements EventRepository {

  constructor(
    @InjectPinoLogger(PrismaEventRepository.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

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
