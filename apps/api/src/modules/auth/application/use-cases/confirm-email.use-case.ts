import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  EmailVerificationTokenRepository,
} from '../../domain/email-verification-token.repository';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/user.repository';
import { InvalidVerificationTokenError } from '../../domain/errors/invalid-verification-token.error';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ConfirmEmailUseCase {

  constructor(
    @InjectPinoLogger(ConfirmEmailUseCase.name) private readonly logger: PinoLogger,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(rawToken: string): Promise<void> {
    this.logger.info('Processing email confirmation');

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenEntity = await this.tokenRepo.findByHash(tokenHash);

    if (!tokenEntity || !tokenEntity.isValid()) {
      throw new InvalidVerificationTokenError();
    }

    await this.userRepo.verifyEmail(tokenEntity.userId);
    await this.tokenRepo.markUsed(tokenEntity.id);
  }
}
