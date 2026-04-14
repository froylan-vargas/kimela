import { Module } from '@nestjs/common';
import { AdminInfrastructureModule } from '../../admin/infrastructure/admin.infrastructure.module';
import { QIMELA_REPOSITORY } from '../domain/qimela.repository';
import { RULE_REPOSITORY } from '../domain/rule.repository';
import { PrismaQimelaRepository } from './persistence/prisma-qimela.repository';
import { PrismaRuleRepository } from './persistence/prisma-rule.repository';

@Module({
  imports: [AdminInfrastructureModule],
  providers: [
    {
      provide: QIMELA_REPOSITORY,
      useClass: PrismaQimelaRepository,
    },
    {
      provide: RULE_REPOSITORY,
      useClass: PrismaRuleRepository,
    },
  ],
  exports: [QIMELA_REPOSITORY, RULE_REPOSITORY, AdminInfrastructureModule],
})
export class QimelaInfrastructureModule {}
