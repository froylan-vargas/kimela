import { Module } from '@nestjs/common';
import { QimelaInfrastructureModule } from './infrastructure/qimela.infrastructure.module';
import { GetQimelasForUserUseCase } from './application/use-cases/get-qimelas-for-user.use-case';
import { QimelaController } from './presentation/qimela.controller';

@Module({
  imports: [QimelaInfrastructureModule],
  providers: [GetQimelasForUserUseCase],
  controllers: [QimelaController],
})
export class QimelaModule {}
