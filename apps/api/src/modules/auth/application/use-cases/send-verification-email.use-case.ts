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

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

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

    const latestToken = await this.tokenRepo.findLatestByUserId(user.id);
    if (latestToken && Date.now() - latestToken.createdAt.getTime() < EMAIL_VERIFICATION_RESEND_COOLDOWN_MS) {
      this.logger.warn(`Skipping verification email due to cooldown for user: ${user.id}`);
      return;
    }

    await this.tokenRepo.deleteByUserId(user.id);

    const rawToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.tokenRepo.create(
      new EmailVerificationTokenEntity({
        id: uuidv4(),
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
        usedAt: null,
        createdAt: new Date(),
      }),
    );

    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${rawToken}`;
    await this.emailService.sendVerificationEmail(user.email, user.name, confirmUrl);
  }
}
