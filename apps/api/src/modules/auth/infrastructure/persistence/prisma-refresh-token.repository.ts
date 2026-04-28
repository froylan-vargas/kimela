import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  RefreshTokenEntity,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {

  constructor(
    @InjectPinoLogger(PrismaRefreshTokenRepository.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async findByHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    this.logger.debug('Finding refresh token by hash');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!record) return null;

    return new RefreshTokenEntity({
      id: record.id,
      tokenHash: record.tokenHash,
      userId: record.userId,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
    });
  }

  async create(token: RefreshTokenEntity): Promise<void> {
    this.logger.debug(`Creating refresh token for user: ${token.userId}`);
    await this.prisma.refreshToken.create({
      data: {
        id: token.id,
        tokenHash: token.tokenHash,
        userId: token.userId,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        createdAt: token.createdAt,
      },
    });
  }

  async revoke(id: string): Promise<void> {
    this.logger.debug(`Revoking refresh token: ${id}`);
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    this.logger.debug(`Revoking all refresh tokens for user: ${userId}`);
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
