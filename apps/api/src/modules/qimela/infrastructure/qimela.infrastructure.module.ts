import { Module } from '@nestjs/common';
import { AdminInfrastructureModule } from '../../admin/infrastructure/admin.infrastructure.module';
import { QIMELA_REPOSITORY } from '../domain/qimela.repository';
import { RULE_REPOSITORY } from '../domain/rule.repository';
import { INVITE_TOKEN_REPOSITORY } from '../domain/invite-token.repository';
import { SESSION_PICK_REPOSITORY } from '../domain/session-pick.repository';
import { PrismaQimelaRepository } from './persistence/prisma-qimela.repository';
import { PrismaRuleRepository } from './persistence/prisma-rule.repository';
import { PrismaInviteTokenRepository } from './persistence/prisma-invite-token.repository';
import { PrismaSessionPickRepository } from './persistence/prisma-session-pick.repository';

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
    {
      provide: INVITE_TOKEN_REPOSITORY,
      useClass: PrismaInviteTokenRepository,
    },
    {
      provide: SESSION_PICK_REPOSITORY,
      useClass: PrismaSessionPickRepository,
    },
  ],
  exports: [QIMELA_REPOSITORY, RULE_REPOSITORY, INVITE_TOKEN_REPOSITORY, SESSION_PICK_REPOSITORY, AdminInfrastructureModule],
})
export class QimelaInfrastructureModule {}
