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
import { GetUpcomingSessionsUseCase } from './application/use-cases/get-upcoming-sessions.use-case';
import { GetAllSessionsUseCase } from './application/use-cases/get-all-sessions.use-case';
import { SaveSessionPicksUseCase } from './application/use-cases/save-session-picks.use-case';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { GetQimelaPhasesUseCase } from './application/use-cases/get-qimela-phases.use-case';
import { GetQimelaResultsUseCase } from './application/use-cases/get-qimela-results.use-case';
import { SubscribeToQimelaUseCase } from './application/use-cases/subscribe-to-qimela.use-case';
import { GetQimelaSubscribersUseCase } from './application/use-cases/get-qimela-subscribers.use-case';
import { RemoveSubscriptionUseCase } from './application/use-cases/remove-subscription.use-case';
import { CreateQimelaLabelUseCase } from './application/use-cases/create-qimela-label.use-case';
import { DeleteQimelaLabelUseCase } from './application/use-cases/delete-qimela-label.use-case';
import { GetQimelaLabelsUseCase } from './application/use-cases/get-qimela-labels.use-case';
import { ApplyLabelUseCase } from './application/use-cases/apply-label.use-case';
import { RemoveLabelUseCase } from './application/use-cases/remove-label.use-case';
import { GetSessionTop5PicksUseCase } from './application/use-cases/get-session-top5-picks.use-case';
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
    GetUpcomingSessionsUseCase,
    GetAllSessionsUseCase,
    SaveSessionPicksUseCase,
    GetLeaderboardUseCase,
    GetQimelaPhasesUseCase,
    GetQimelaResultsUseCase,
    SubscribeToQimelaUseCase,
    GetQimelaSubscribersUseCase,
    RemoveSubscriptionUseCase,
    CreateQimelaLabelUseCase,
    DeleteQimelaLabelUseCase,
    GetQimelaLabelsUseCase,
    ApplyLabelUseCase,
    RemoveLabelUseCase,
    GetSessionTop5PicksUseCase,
  ],
  controllers: [QimelaController, InviteController],
})
export class QimelaModule {}
