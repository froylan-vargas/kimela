import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenEntity,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class RefreshTokenUseCase {

  constructor(
    @InjectPinoLogger(RefreshTokenUseCase.name) private readonly logger: PinoLogger,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(incomingToken: string): Promise<{ userId: string; newRefreshToken: string }> {
    this.logger.info('Processing refresh token rotation');

    const tokenHash = crypto.createHash('sha256').update(incomingToken).digest('hex');

    const storedToken = await this.refreshTokenRepository.findByHash(tokenHash);
    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!storedToken.isValid()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    await this.refreshTokenRepository.revoke(storedToken.id);

    const newRawToken = uuidv4();
    const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');
    const now = new Date();

    const newTokenEntity = new RefreshTokenEntity({
      id: uuidv4(),
      tokenHash: newTokenHash,
      userId: storedToken.userId,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      revokedAt: null,
      createdAt: now,
    });

    await this.refreshTokenRepository.create(newTokenEntity);

    return { userId: storedToken.userId, newRefreshToken: newRawToken };
  }
}
