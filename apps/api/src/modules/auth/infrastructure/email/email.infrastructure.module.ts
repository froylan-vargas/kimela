import { Module } from '@nestjs/common';
import { EMAIL_SERVICE } from '../../application/services/email.service';
import { ResendEmailService } from './resend-email.service';
import { EmailQueueService } from './email-queue.service';
import { EmailWorkerService } from './email-worker.service';
import { PgBossModule } from '../../../../shared/queue/pgboss.module';

@Module({
  imports: [PgBossModule],
  providers: [
    ResendEmailService,
    EmailWorkerService,
    { provide: EMAIL_SERVICE, useClass: EmailQueueService },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailInfrastructureModule {}
