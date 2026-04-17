import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Public } from '../../auth/presentation/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { GenerateInviteTokenUseCase, GenerateInviteTokenResponse } from '../application/use-cases/generate-invite-token.use-case';
import { RevokeInviteTokenUseCase } from '../application/use-cases/revoke-invite-token.use-case';
import { GetQimelaByInviteTokenUseCase, GetQimelaByInviteTokenResponse } from '../application/use-cases/get-qimela-by-invite-token.use-case';
import { SubscribeViaInviteTokenUseCase, SubscribeViaInviteTokenResponse } from '../application/use-cases/subscribe-via-invite-token.use-case';

@Controller()
export class InviteController {
  private readonly logger = new Logger(InviteController.name);

  constructor(
    private readonly generateInviteToken: GenerateInviteTokenUseCase,
    private readonly revokeInviteToken: RevokeInviteTokenUseCase,
    private readonly getQimelaByInviteToken: GetQimelaByInviteTokenUseCase,
    private readonly subscribeViaInviteToken: SubscribeViaInviteTokenUseCase,
  ) {}

  @Post('qimelas/:id/invite')
  @HttpCode(HttpStatus.OK)
  async generate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GenerateInviteTokenResponse> {
    this.logger.log(`POST /qimelas/${id}/invite requested by user ${user.id}`);
    return this.generateInviteToken.execute({ qimelaId: id, requesterId: user.id });
  }

  @Delete('qimelas/:id/invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    this.logger.log(`DELETE /qimelas/${id}/invite requested by user ${user.id}`);
    return this.revokeInviteToken.execute({ qimelaId: id, requesterId: user.id });
  }

  @Public()
  @Get('invite/:token')
  async getByToken(
    @Param('token') token: string,
  ): Promise<GetQimelaByInviteTokenResponse> {
    this.logger.log(`GET /invite/:token requested`);
    return this.getQimelaByInviteToken.execute(token);
  }

  @Post('invite/:token/subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Param('token') token: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SubscribeViaInviteTokenResponse> {
    this.logger.log(`POST /invite/${token}/subscribe requested by user ${user.id}`);
    return this.subscribeViaInviteToken.execute({ token, userId: user.id });
  }
}
