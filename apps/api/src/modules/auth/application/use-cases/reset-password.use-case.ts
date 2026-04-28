import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenRepository,
} from '../../domain/password-reset-token.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/user.repository';
import { InvalidResetTokenError } from '../../domain/errors/invalid-reset-token.error';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ResetPasswordUseCase {

  constructor(
    @InjectPinoLogger(ResetPasswordUseCase.name) private readonly logger: PinoLogger,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokenRepo: PasswordResetTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  async execute(rawToken: string, newPassword: string): Promise<void> {
    this.logger.info('Processing password reset');

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await this.resetTokenRepo.findByHash(tokenHash);

    if (!tokenEntity || !tokenEntity.isValid()) {
      throw new InvalidResetTokenError();
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.updatePassword(tokenEntity.userId, passwordHash);
    await this.resetTokenRepo.markUsed(tokenEntity.id);
    await this.refreshTokenRepo.revokeAllByUserId(tokenEntity.userId);
  }
}
