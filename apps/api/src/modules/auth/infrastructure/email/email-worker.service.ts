import { Injectable, OnModuleInit } from '@nestjs/common';
import { PgBossService } from '../../../../shared/queue/pgboss.service';
import { ResendEmailService } from './resend-email.service';
import { EMAIL_VERIFICATION_QUEUE, EMAIL_PASSWORD_RESET_QUEUE } from './email-queue.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const DELETE_AFTER_SECONDS = 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class EmailWorkerService implements OnModuleInit {

  constructor(
    @InjectPinoLogger(EmailWorkerService.name) private readonly logger: PinoLogger,
    private readonly pgBoss: PgBossService,
    private readonly resendEmail: ResendEmailService,
  ) {}

  async onModuleInit(): Promise<void> {
    const { boss } = this.pgBoss;

    await boss.createQueue(EMAIL_VERIFICATION_QUEUE, { deleteAfterSeconds: DELETE_AFTER_SECONDS });
    await boss.createQueue(EMAIL_PASSWORD_RESET_QUEUE, { deleteAfterSeconds: DELETE_AFTER_SECONDS });

    await boss.work<{ to: string; name: string; confirmUrl: string }>(
      EMAIL_VERIFICATION_QUEUE,
      async (jobs) => {
        for (const job of jobs) {
          const { to, name, confirmUrl } = job.data;
          this.logger.info(`Processing verification email job ${job.id} for: ${to}`);
          await this.resendEmail.sendVerificationEmail(to, name, confirmUrl);
        }
      },
    );

    await boss.work<{ to: string; name: string; resetUrl: string }>(
      EMAIL_PASSWORD_RESET_QUEUE,
      async (jobs) => {
        for (const job of jobs) {
          const { to, name, resetUrl } = job.data;
          this.logger.info(`Processing password reset email job ${job.id} for: ${to}`);
          await this.resendEmail.sendPasswordResetEmail(to, name, resetUrl);
        }
      },
    );

    this.logger.info('Email workers registered');
  }
}
