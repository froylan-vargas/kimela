import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  EmailVerificationTokenEntity,
  EmailVerificationTokenRepository,
} from '../../domain/email-verification-token.repository';
import { EMAIL_SERVICE, EmailService } from '../services/email.service';
import { UserEntity } from '../../../users/domain/user.entity';

@Injectable()
export class SendVerificationEmailUseCase {
  private readonly logger = new Logger(SendVerificationEmailUseCase.name);

  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly tokenRepo: EmailVerificationTokenRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailService,
  ) {}

  async execute(user: UserEntity): Promise<void> {
    this.logger.log(`Sending verification email to user: ${user.id}`);

    await this.tokenRepo.deleteByUserId(user.id);

    const rawToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.tokenRepo.create(
      new EmailVerificationTokenEntity({
        id: uuidv4(),
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      }),
    );

    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${rawToken}`;
    await this.emailService.sendVerificationEmail(user.email, user.name, confirmUrl);
  }
}
