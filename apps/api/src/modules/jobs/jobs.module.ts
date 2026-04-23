import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { ScoringWorkerService } from './scoring/scoring-worker.service';
import { PickScoringService } from './scoring/pick-scoring.service';
import { PgBossModule } from '../../shared/queue/pgboss.module';

@Module({
  imports: [PgBossModule],
  controllers: [JobsController],
  providers: [ScoringWorkerService, PickScoringService],
})
export class JobsModule {}
