import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PhaseEntity, PhaseStatus } from '../../domain/phase.entity';
import {
  PhaseRepository,
  FindPhasesByEventOptions,
  CreatePhaseOptions,
  ReorderPhaseItem,
} from '../../domain/phase.repository';
import { PhasePersistenceMapper } from './phase-persistence.mapper';

@Injectable()
export class PrismaPhaseRepository implements PhaseRepository {
  private readonly logger = new Logger(PrismaPhaseRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByEvent(options: FindPhasesByEventOptions): Promise<PhaseEntity[]> {
    const { eventId } = options;

    this.logger.debug(`Finding phases for event ${eventId}`);

    const records = await this.prisma.phase.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
    });

    return records.map((record) => PhasePersistenceMapper.toDomain(record));
  }

  async findById(id: string): Promise<PhaseEntity | null> {
    this.logger.debug(`Finding phase by id ${id}`);

    const record = await this.prisma.phase.findUnique({ where: { id } });

    return record ? PhasePersistenceMapper.toDomain(record) : null;
  }

  async getMaxOrderForEvent(eventId: string): Promise<number> {
    this.logger.debug(`Getting max order for event ${eventId}`);

    const result = await this.prisma.phase.aggregate({
      where: { eventId },
      _max: { order: true },
    });

    return result._max.order ?? 0;
  }

  async create(options: CreatePhaseOptions): Promise<PhaseEntity> {
    const { eventId, name, type } = options;

    this.logger.debug(`Creating phase "${name}" for event ${eventId}`);

    const maxOrder = await this.getMaxOrderForEvent(eventId);
    const nextOrder = maxOrder + 1;

    const record = await this.prisma.phase.create({
      data: {
        name,
        type,
        order: nextOrder,
        eventId,
      },
    });

    return PhasePersistenceMapper.toDomain(record);
  }

  async reorder(items: ReorderPhaseItem[]): Promise<PhaseEntity[]> {
    this.logger.debug(`Reordering ${items.length} phases in transaction`);

    const TEMP_OFFSET = 10000;

    await this.prisma.$transaction(async (tx) => {
      // First pass: shift all orders to a safe temporary range to avoid conflicts
      for (const item of items) {
        await tx.phase.update({
          where: { id: item.id },
          data: { order: item.order + TEMP_OFFSET },
        });
      }

      // Second pass: set the final order values
      for (const item of items) {
        await tx.phase.update({
          where: { id: item.id },
          data: { order: item.order },
        });
      }
    });

    const updatedIds = items.map((item) => item.id);
    const records = await this.prisma.phase.findMany({
      where: { id: { in: updatedIds } },
      orderBy: { order: 'asc' },
    });

    return records.map((record) => PhasePersistenceMapper.toDomain(record));
  }

  async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting phase ${id}`);
    await this.prisma.phase.delete({ where: { id } });
  }

  async updateStatus(id: string, status: PhaseStatus): Promise<PhaseEntity> {
    this.logger.debug(`Updating phase ${id} status to ${status}`);

    const record = await this.prisma.phase.update({
      where: { id },
      data: { status },
    });

    return PhasePersistenceMapper.toDomain(record);
  }
}
