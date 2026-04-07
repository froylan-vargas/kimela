import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';

@Injectable()
export class LogoutUserUseCase {
  private readonly logger = new Logger(LogoutUserUseCase.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(incomingToken: string): Promise<void> {
    this.logger.log('Processing logout');

    const tokenHash = crypto.createHash('sha256').update(incomingToken).digest('hex');
    const storedToken = await this.refreshTokenRepository.findByHash(tokenHash);

    if (storedToken) {
      await this.refreshTokenRepository.revoke(storedToken.id);
    }
  }
}
