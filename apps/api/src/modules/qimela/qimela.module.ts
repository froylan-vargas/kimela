import { Module } from '@nestjs/common';
import { QimelaInfrastructureModule } from './infrastructure/qimela.infrastructure.module';
import { GetQimelasForUserUseCase } from './application/use-cases/get-qimelas-for-user.use-case';
import { GetSportsForQimelaUseCase } from './application/use-cases/get-sports-for-qimela.use-case';
import { GetEventsForQimelaUseCase } from './application/use-cases/get-events-for-qimela.use-case';
import { GetRulesUseCase } from './application/use-cases/get-rules.use-case';
import { CreateQimelaUseCase } from './application/use-cases/create-qimela.use-case';
import { UpdateQimelaUseCase } from './application/use-cases/update-qimela.use-case';
import { GetQimelaByIdUseCase } from './application/use-cases/get-qimela-by-id.use-case';
import { QimelaController } from './presentation/qimela.controller';

@Module({
  imports: [QimelaInfrastructureModule],
  providers: [
    GetQimelasForUserUseCase,
    GetQimelaByIdUseCase,
    GetSportsForQimelaUseCase,
    GetEventsForQimelaUseCase,
    GetRulesUseCase,
    CreateQimelaUseCase,
    UpdateQimelaUseCase,
  ],
  controllers: [QimelaController],
})
export class QimelaModule {}
