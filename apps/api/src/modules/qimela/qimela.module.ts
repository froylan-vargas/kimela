import { Module } from '@nestjs/common';
import { QimelaInfrastructureModule } from './infrastructure/qimela.infrastructure.module';
import { GetQimelasForUserUseCase } from './application/use-cases/get-qimelas-for-user.use-case';
import { GetSportsForQimelaUseCase } from './application/use-cases/get-sports-for-qimela.use-case';
import { GetEventsForQimelaUseCase } from './application/use-cases/get-events-for-qimela.use-case';
import { GetRulesUseCase } from './application/use-cases/get-rules.use-case';
import { CreateQimelaUseCase } from './application/use-cases/create-qimela.use-case';
import { UpdateQimelaUseCase } from './application/use-cases/update-qimela.use-case';
import { GetQimelaByIdUseCase } from './application/use-cases/get-qimela-by-id.use-case';
import { GenerateInviteTokenUseCase } from './application/use-cases/generate-invite-token.use-case';
import { RevokeInviteTokenUseCase } from './application/use-cases/revoke-invite-token.use-case';
import { GetQimelaByInviteTokenUseCase } from './application/use-cases/get-qimela-by-invite-token.use-case';
import { SubscribeViaInviteTokenUseCase } from './application/use-cases/subscribe-via-invite-token.use-case';
import { QimelaController } from './presentation/qimela.controller';
import { InviteController } from './presentation/invite.controller';

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
    GenerateInviteTokenUseCase,
    RevokeInviteTokenUseCase,
    GetQimelaByInviteTokenUseCase,
    SubscribeViaInviteTokenUseCase,
  ],
  controllers: [QimelaController, InviteController],
})
export class QimelaModule {}
