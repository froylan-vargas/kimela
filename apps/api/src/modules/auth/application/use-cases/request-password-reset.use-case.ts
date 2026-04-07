import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenEntity,
  PasswordResetTokenRepository,
} from '../../domain/password-reset-token.repository';
import { EMAIL_SERVICE, EmailService } from '../services/email.service';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/user.repository';

@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly tokenRepo: PasswordResetTokenRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailService,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(email: string): Promise<void> {
    this.logger.log(`Processing password reset request for email: ${email}`);

    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Silently return to avoid leaking user existence
      return;
    }

    await this.tokenRepo.deleteByUserId(user.id);

    const rawToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.tokenRepo.create(
      new PasswordResetTokenEntity({
        id: uuidv4(),
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
      }),
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await this.emailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
  }
}
