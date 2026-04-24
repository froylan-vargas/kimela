import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { GetQimelasForUserUseCase } from '../application/use-cases/get-qimelas-for-user.use-case';
import { GetQimelaByIdUseCase, GetQimelaByIdResponse } from '../application/use-cases/get-qimela-by-id.use-case';
import { GetSportsForQimelaUseCase, GetSportsForQimelaResponse } from '../application/use-cases/get-sports-for-qimela.use-case';
import { GetEventsForQimelaUseCase, GetEventsForQimelaResponse } from '../application/use-cases/get-events-for-qimela.use-case';
import { GetRulesUseCase, GetRulesResponse } from '../application/use-cases/get-rules.use-case';
import { CreateQimelaUseCase, CreateQimelaResponse } from '../application/use-cases/create-qimela.use-case';
import { UpdateQimelaUseCase, UpdateQimelaResponse } from '../application/use-cases/update-qimela.use-case';
import { PaginatedQimelaResponse } from '../application/dtos/qimela.dto';
import { GetUpcomingSessionsUseCase, GetUpcomingSessionsResponse } from '../application/use-cases/get-upcoming-sessions.use-case';
import { GetAllSessionsUseCase, GetAllSessionsResponse } from '../application/use-cases/get-all-sessions.use-case';
import { SaveSessionPicksUseCase, SaveSessionPicksResponse } from '../application/use-cases/save-session-picks.use-case';
import { GetLeaderboardUseCase, GetLeaderboardResponse } from '../application/use-cases/get-leaderboard.use-case';
import { GetQimelaPhasesUseCase, GetQimelaPhasesResponse } from '../application/use-cases/get-qimela-phases.use-case';
import { GetQimelaResultsUseCase, GetQimelaResultsResponse } from '../application/use-cases/get-qimela-results.use-case';
import { CurrentUser, CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { GetQimelasRequestDto } from './dtos/get-qimelas-request.dto';
import { CreateQimelaRequestDto } from './dtos/create-qimela-request.dto';
import { UpdateQimelaRequestDto } from './dtos/update-qimela-request.dto';
import { SavePicksRequestDto } from './dtos/save-picks-request.dto';

@Controller('qimelas')
export class QimelaController {
  private readonly logger = new Logger(QimelaController.name);

  constructor(
    private readonly getQimelasForUser: GetQimelasForUserUseCase,
    private readonly getQimelaById: GetQimelaByIdUseCase,
    private readonly getSportsForQimela: GetSportsForQimelaUseCase,
    private readonly getEventsForQimela: GetEventsForQimelaUseCase,
    private readonly getRules: GetRulesUseCase,
    private readonly createQimela: CreateQimelaUseCase,
    private readonly updateQimela: UpdateQimelaUseCase,
    private readonly getUpcomingSessions: GetUpcomingSessionsUseCase,
    private readonly getAllSessions: GetAllSessionsUseCase,
    private readonly saveSessionPicks: SaveSessionPicksUseCase,
    private readonly getLeaderboard: GetLeaderboardUseCase,
    private readonly getQimelaPhases: GetQimelaPhasesUseCase,
    private readonly getQimelaResults: GetQimelaResultsUseCase,
  ) {}

  @Get()
  async getQimelas(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetQimelasRequestDto,
  ): Promise<PaginatedQimelaResponse> {
    this.logger.log(`GET /qimelas requested by user ${user.id}`);
    return this.getQimelasForUser.execute({ userId: user.id, status: query.status });
  }

  @Get('sports')
  async getSports(): Promise<GetSportsForQimelaResponse> {
    this.logger.log('GET /qimelas/sports requested');
    return this.getSportsForQimela.execute();
  }

  @Get('sports/:sportId/events')
  async getEvents(
    @Param('sportId', ParseUUIDPipe) sportId: string,
  ): Promise<GetEventsForQimelaResponse> {
    this.logger.log(`GET /qimelas/sports/${sportId}/events requested`);
    return this.getEventsForQimela.execute(sportId);
  }

  @Get('rules')
  async listRules(): Promise<GetRulesResponse> {
    this.logger.log('GET /qimelas/rules requested');
    return this.getRules.execute();
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GetQimelaByIdResponse> {
    this.logger.log(`GET /qimelas/${id} requested`);
    return this.getQimelaById.execute(id);
  }

  @Get(':qimelaId/leaderboard')
  async listLeaderboard(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @Query('phaseId') phaseId?: string,
  ): Promise<GetLeaderboardResponse> {
    this.logger.log(`GET /qimelas/${qimelaId}/leaderboard requested`);
    return this.getLeaderboard.execute(qimelaId, phaseId);
  }

  @Get(':qimelaId/phases')
  async listPhases(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetQimelaPhasesResponse> {
    this.logger.log(`GET /qimelas/${qimelaId}/phases requested by user ${user.id}`);
    return this.getQimelaPhases.execute({ qimelaId, userId: user.id });
  }

  @Get(':qimelaId/results')
  async listResults(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('phaseId', ParseUUIDPipe) phaseId: string,
    @Query('userIds') userIds?: string,
  ): Promise<GetQimelaResultsResponse> {
    this.logger.log(`GET /qimelas/${qimelaId}/results requested by user ${user.id}`);
    const compareUserIds = (userIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0 && id !== user.id);
    return this.getQimelaResults.execute({
      qimelaId,
      userId: user.id,
      phaseId,
      compareUserIds,
    });
  }

  @Get(':qimelaId/sessions/upcoming')
  async getUpcoming(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetUpcomingSessionsResponse> {
    this.logger.log(`GET /qimelas/${qimelaId}/sessions/upcoming requested by user ${user.id}`);
    return this.getUpcomingSessions.execute({ qimelaId, userId: user.id });
  }

  @Get(':qimelaId/sessions')
  async getSessions(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetAllSessionsResponse> {
    this.logger.log(`GET /qimelas/${qimelaId}/sessions requested by user ${user.id}`);
    return this.getAllSessions.execute({ qimelaId, userId: user.id });
  }

  @Post(':qimelaId/sessions/:sessionId/picks')
  @HttpCode(HttpStatus.OK)
  async savePicks(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: SavePicksRequestDto,
  ): Promise<SaveSessionPicksResponse> {
    this.logger.log(`POST /qimelas/${qimelaId}/sessions/${sessionId}/picks requested by user ${user.id}`);
    return this.saveSessionPicks.execute({
      qimelaId,
      sessionId,
      userId: user.id,
      picks: body.picks.map((pick) => ({
        pickCategoryId: pick.pickCategoryId,
        value: pick.value ?? null,
        pickedContenderId: pick.pickedContenderId ?? null,
      })),
    });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: UpdateQimelaRequestDto,
  ): Promise<UpdateQimelaResponse> {
    this.logger.log(`PATCH /qimelas/${id} requested by user ${user.id}`);
    return this.updateQimela.execute({
      id,
      requesterId: user.id,
      name: body.name,
      initialPhaseId: body.initialPhaseId,
      finalPhaseId: body.finalPhaseId,
      rules: body.rules,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: CreateQimelaRequestDto,
  ): Promise<CreateQimelaResponse> {
    this.logger.log(`POST /qimelas requested by user ${user.id}`);
    return this.createQimela.execute({
      creatorId: user.id,
      name: body.name,
      sportId: body.sportId,
      eventId: body.eventId,
      leagueId: body.leagueId,
      initialPhaseId: body.initialPhaseId,
      finalPhaseId: body.finalPhaseId,
      rules: body.rules,
    });
  }
}
