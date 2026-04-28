import { Injectable } from '@nestjs/common';
import { EmailService } from '../../application/services/email.service';
import { PgBossService } from '../../../../shared/queue/pgboss.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export const EMAIL_VERIFICATION_QUEUE = 'email.verification';
export const EMAIL_PASSWORD_RESET_QUEUE = 'email.password-reset';

@Injectable()
export class EmailQueueService implements EmailService {

  constructor(
    @InjectPinoLogger(EmailQueueService.name) private readonly logger: PinoLogger,
    private readonly pgBoss: PgBossService,
  ) {}

  async sendVerificationEmail(to: string, name: string, confirmUrl: string): Promise<void> {
    this.logger.info(`Enqueuing verification email for: ${to}`);
    await this.pgBoss.boss.send(EMAIL_VERIFICATION_QUEUE, { to, name, confirmUrl });
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
    this.logger.info(`Enqueuing password reset email for: ${to}`);
    await this.pgBoss.boss.send(EMAIL_PASSWORD_RESET_QUEUE, { to, name, resetUrl });
  }
}
