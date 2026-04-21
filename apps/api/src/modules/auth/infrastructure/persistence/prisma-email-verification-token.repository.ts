import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  EmailVerificationTokenEntity,
  EmailVerificationTokenRepository,
} from '../../domain/email-verification-token.repository';

@Injectable()
export class PrismaEmailVerificationTokenRepository
  implements EmailVerificationTokenRepository
{
  private readonly logger = new Logger(PrismaEmailVerificationTokenRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null> {
    this.logger.debug('Finding email verification token by hash');
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record) return null;

    return new EmailVerificationTokenEntity({
      id: record.id,
      tokenHash: record.tokenHash,
      userId: record.userId,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
  }

  async findLatestByUserId(userId: string): Promise<EmailVerificationTokenEntity | null> {
    this.logger.debug(`Finding latest email verification token for user: ${userId}`);
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return null;

    return new EmailVerificationTokenEntity({
      id: record.id,
      tokenHash: record.tokenHash,
      userId: record.userId,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
  }

  async create(token: EmailVerificationTokenEntity): Promise<void> {
    this.logger.debug(`Creating email verification token for user: ${token.userId}`);
    await this.prisma.emailVerificationToken.create({
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
    this.logger.debug(`Marking email verification token as used: ${id}`);
    await this.prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.logger.debug(`Deleting email verification tokens for user: ${userId}`);
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
  }
}
