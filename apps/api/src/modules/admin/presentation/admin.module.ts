import { Module } from '@nestjs/common';
import { AdminInfrastructureModule } from '../infrastructure/admin.infrastructure.module';
import { GetSportsUseCase } from '../application/use-cases/get-sports.use-case';
import { GetActiveEventsBySportUseCase } from '../application/use-cases/get-active-events-by-sport.use-case';
import { GetPhasesByEventUseCase } from '../application/use-cases/get-phases-by-event.use-case';
import { CreatePhaseUseCase } from '../application/use-cases/create-phase.use-case';
import { ReorderPhasesUseCase } from '../application/use-cases/reorder-phases.use-case';
import { GetSessionsByPhaseUseCase } from '../application/use-cases/get-sessions-by-phase.use-case';
import { UploadSessionsUseCase } from '../application/use-cases/upload-sessions.use-case';
import { DeletePhaseUseCase } from '../application/use-cases/delete-phase.use-case';
import { ActivatePhaseUseCase } from '../application/use-cases/activate-phase.use-case';
import { CompletePhaseUseCase } from '../application/use-cases/complete-phase.use-case';
import { AdminController } from './admin.controller';

@Module({
  imports: [AdminInfrastructureModule],
  providers: [
    GetSportsUseCase,
    GetActiveEventsBySportUseCase,
    GetPhasesByEventUseCase,
    CreatePhaseUseCase,
    ReorderPhasesUseCase,
    DeletePhaseUseCase,
    ActivatePhaseUseCase,
    CompletePhaseUseCase,
    GetSessionsByPhaseUseCase,
    UploadSessionsUseCase,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
