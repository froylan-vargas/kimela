import { Module } from '@nestjs/common';
import { KIMELA_REPOSITORY } from '../domain/kimela.repository';
import { PrismaKimelaRepository } from './persistence/prisma-kimela.repository';

@Module({
  providers: [
    {
      provide: KIMELA_REPOSITORY,
      useClass: PrismaKimelaRepository,
    },
  ],
  exports: [KIMELA_REPOSITORY],
})
export class KimelaInfrastructureModule {}
