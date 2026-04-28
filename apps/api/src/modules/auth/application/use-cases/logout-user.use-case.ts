import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';

@Injectable()
export class LogoutUserUseCase {

  constructor(
    @InjectPinoLogger(LogoutUserUseCase.name) private readonly logger: PinoLogger,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(incomingToken: string): Promise<void> {
    this.logger.info('Processing logout');

    const tokenHash = crypto.createHash('sha256').update(incomingToken).digest('hex');
    const storedToken = await this.refreshTokenRepository.findByHash(tokenHash);

    if (storedToken) {
      await this.refreshTokenRepository.revoke(storedToken.id);
    }
  }
}
