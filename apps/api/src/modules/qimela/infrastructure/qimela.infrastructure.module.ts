import { Module } from '@nestjs/common';
import { QIMELA_REPOSITORY } from '../domain/qimela.repository';
import { PrismaQimelaRepository } from './persistence/prisma-qimela.repository';

@Module({
  providers: [
    {
      provide: QIMELA_REPOSITORY,
      useClass: PrismaQimelaRepository,
    },
  ],
  exports: [QIMELA_REPOSITORY],
})
export class QimelaInfrastructureModule {}
