import { Module } from '@nestjs/common';
import { SPORT_REPOSITORY } from '../domain/sport.repository';
import { EVENT_REPOSITORY } from '../domain/event.repository';
import { PHASE_REPOSITORY } from '../domain/phase.repository';
import { SESSION_REPOSITORY } from '../domain/session.repository';
import { PrismaSportRepository } from './persistence/prisma-sport.repository';
import { PrismaEventRepository } from './persistence/prisma-event.repository';
import { PrismaPhaseRepository } from './persistence/prisma-phase.repository';
import { PrismaSessionRepository } from './persistence/prisma-session.repository';

@Module({
  providers: [
    {
      provide: SPORT_REPOSITORY,
      useClass: PrismaSportRepository,
    },
    {
      provide: EVENT_REPOSITORY,
      useClass: PrismaEventRepository,
    },
    {
      provide: PHASE_REPOSITORY,
      useClass: PrismaPhaseRepository,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: PrismaSessionRepository,
    },
  ],
  exports: [SPORT_REPOSITORY, EVENT_REPOSITORY, PHASE_REPOSITORY, SESSION_REPOSITORY],
})
export class AdminInfrastructureModule {}
