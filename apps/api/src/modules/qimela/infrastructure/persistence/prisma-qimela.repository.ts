import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { QimelaEntity } from '../../domain/qimela.entity';
import { FindForUserOptions, QimelaPatch, QimelaRepository } from '../../domain/qimela.repository';
import { QimelaPersistenceMapper } from './qimela-persistence.mapper';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaQimelaRepository implements QimelaRepository {

  constructor(
    @InjectPinoLogger(PrismaQimelaRepository.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string): Promise<QimelaEntity | null> {
    this.logger.debug(`Finding qimela by id ${id}`);
    const record = await this.prisma.qimela.findUnique({ where: { id } });
    return record ? QimelaPersistenceMapper.toDomain(record) : null;
  }

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

  async save(entity: QimelaEntity): Promise<QimelaEntity> {
    this.logger.debug(`Saving qimela ${entity.id}`);

    const record = await this.prisma.$transaction(async (tx) => {
      return tx.qimela.create({
        data: {
          id: entity.id,
          name: entity.name,
          status: QimelaPersistenceMapper.toPrismaStatus(entity.status),
          sportId: entity.sportId,
          creatorId: entity.creatorId,
          eventId: entity.eventId,
          leagueId: entity.leagueId,
          startPhaseId: entity.startPhaseId,
          endPhaseId: entity.endPhaseId,
          rules: {
            create: entity.rules.map((r) => ({
              id: randomUUID(),
              ruleId: r.ruleId,
              points: r.points,
            })),
          },
        },
      });
    });

    return QimelaPersistenceMapper.toDomain(record);
  }

  async update(id: string, patch: QimelaPatch): Promise<QimelaEntity> {
    this.logger.debug(`Updating qimela ${id}`);

    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.startPhaseId !== undefined) data.startPhaseId = patch.startPhaseId;
    if (patch.endPhaseId !== undefined) data.endPhaseId = patch.endPhaseId;

    const record = await this.prisma.qimela.update({ where: { id }, data });
    return QimelaPersistenceMapper.toDomain(record);
  }
}
