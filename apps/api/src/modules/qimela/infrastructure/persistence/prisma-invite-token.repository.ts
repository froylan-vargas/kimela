import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { InviteTokenEntity } from '../../domain/invite-token.entity';
import { InviteTokenRepository } from '../../domain/invite-token.repository';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaInviteTokenRepository implements InviteTokenRepository {

  constructor(
    @InjectPinoLogger(PrismaInviteTokenRepository.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async findByToken(token: string): Promise<InviteTokenEntity | null> {
    this.logger.debug(`Finding invite token by token`);
    const record = await this.prisma.inviteToken.findUnique({ where: { token } });
    return record ? this.toDomain(record) : null;
  }

  async findByQimelaId(qimelaId: string): Promise<InviteTokenEntity | null> {
    this.logger.debug(`Finding invite token for qimela ${qimelaId}`);
    const record = await this.prisma.inviteToken.findUnique({ where: { qimelaId } });
    return record ? this.toDomain(record) : null;
  }

  async upsert(entity: InviteTokenEntity): Promise<InviteTokenEntity> {
    this.logger.debug(`Upserting invite token for qimela ${entity.qimelaId}`);
    const record = await this.prisma.inviteToken.upsert({
      where: { qimelaId: entity.qimelaId },
      create: {
        id: entity.id,
        token: entity.token,
        qimelaId: entity.qimelaId,
        revoked: entity.revoked,
        createdAt: entity.createdAt,
      },
      update: {
        id: entity.id,
        token: entity.token,
        revoked: false,
        createdAt: entity.createdAt,
      },
    });
    return this.toDomain(record);
  }

  async revoke(id: string): Promise<void> {
    this.logger.debug(`Revoking invite token ${id}`);
    await this.prisma.inviteToken.update({ where: { id }, data: { revoked: true } });
  }

  async revokeByQimelaId(qimelaId: string): Promise<void> {
    this.logger.debug(`Revoking invite token for qimela ${qimelaId}`);
    await this.prisma.inviteToken.updateMany({ where: { qimelaId }, data: { revoked: true } });
  }

  private toDomain(record: {
    id: string;
    token: string;
    qimelaId: string;
    revoked: boolean;
    createdAt: Date;
  }): InviteTokenEntity {
    return new InviteTokenEntity({
      id: record.id,
      token: record.token,
      qimelaId: record.qimelaId,
      revoked: record.revoked,
      createdAt: record.createdAt,
    });
  }
}
