import { Module } from '@nestjs/common';
import { KimelaInfrastructureModule } from './infrastructure/kimela.infrastructure.module';
import { GetKimelasForUserUseCase } from './application/use-cases/get-kimelas-for-user.use-case';
import { KimelaController } from './presentation/kimela.controller';

@Module({
  imports: [KimelaInfrastructureModule],
  providers: [GetKimelasForUserUseCase],
  controllers: [KimelaController],
})
export class KimelaModule {}
