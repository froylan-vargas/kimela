import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  PasswordResetTokenEntity,
  PasswordResetTokenRepository,
} from '../../domain/password-reset-token.repository';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly logger = new Logger(PrismaPasswordResetTokenRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByHash(tokenHash: string): Promise<PasswordResetTokenEntity | null> {
    this.logger.debug('Finding password reset token by hash');
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record) return null;

    return new PasswordResetTokenEntity({
      id: record.id,
      tokenHash: record.tokenHash,
      userId: record.userId,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
  }

  async create(token: PasswordResetTokenEntity): Promise<void> {
    this.logger.debug(`Creating password reset token for user: ${token.userId}`);
    await this.prisma.passwordResetToken.create({
      data: {
        id: token.id,
        tokenHash: token.tokenHash,
        userId: token.userId,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt,
        createdAt: token.createdAt,
      },
    });
  }

  async markUsed(id: string): Promise<void> {
    this.logger.debug(`Marking password reset token as used: ${id}`);
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.logger.debug(`Deleting password reset tokens for user: ${userId}`);
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
  }
}
