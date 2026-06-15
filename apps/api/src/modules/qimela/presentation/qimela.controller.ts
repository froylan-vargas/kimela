import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { GetQimelasForUserUseCase } from '../application/use-cases/get-qimelas-for-user.use-case';
import { GetQimelaByIdUseCase, GetQimelaByIdResponse } from '../application/use-cases/get-qimela-by-id.use-case';
import { GetSportsForQimelaUseCase, GetSportsForQimelaResponse } from '../application/use-cases/get-sports-for-qimela.use-case';
import { GetEventsForQimelaUseCase, GetEventsForQimelaResponse } from '../application/use-cases/get-events-for-qimela.use-case';
import { GetRulesUseCase, GetRulesResponse } from '../application/use-cases/get-rules.use-case';
import { CreateQimelaUseCase, CreateQimelaResponse } from '../application/use-cases/create-qimela.use-case';
import { UpdateQimelaUseCase, UpdateQimelaResponse } from '../application/use-cases/update-qimela.use-case';
import { SubscribeToQimelaUseCase, SubscribeToQimelaResponse } from '../application/use-cases/subscribe-to-qimela.use-case';
import { PaginatedQimelaResponse } from '../application/dtos/qimela.dto';
import { GetUpcomingSessionsUseCase, GetUpcomingSessionsResponse } from '../application/use-cases/get-upcoming-sessions.use-case';
import { GetAllSessionsUseCase, GetAllSessionsResponse } from '../application/use-cases/get-all-sessions.use-case';
import { SaveSessionPicksUseCase, SaveSessionPicksResponse } from '../application/use-cases/save-session-picks.use-case';
import { GetLeaderboardUseCase, GetLeaderboardResponse } from '../application/use-cases/get-leaderboard.use-case';
import { GetQimelaPhasesUseCase, GetQimelaPhasesResponse } from '../application/use-cases/get-qimela-phases.use-case';
import { GetQimelaResultsUseCase, GetQimelaResultsResponse } from '../application/use-cases/get-qimela-results.use-case';
import { GetQimelaSubscribersUseCase, GetQimelaSubscribersResponse } from '../application/use-cases/get-qimela-subscribers.use-case';
import { RemoveSubscriptionUseCase, RemoveSubscriptionResponse } from '../application/use-cases/remove-subscription.use-case';
import { CreateQimelaLabelUseCase, CreateQimelaLabelResponse } from '../application/use-cases/create-qimela-label.use-case';
import { DeleteQimelaLabelUseCase, DeleteQimelaLabelResponse } from '../application/use-cases/delete-qimela-label.use-case';
import { GetQimelaLabelsUseCase, GetQimelaLabelsResponse } from '../application/use-cases/get-qimela-labels.use-case';
import { ApplyLabelUseCase, ApplyLabelResponse } from '../application/use-cases/apply-label.use-case';
import { RemoveLabelUseCase, RemoveLabelResponse } from '../application/use-cases/remove-label.use-case';
import { GetSessionTop5PicksUseCase, GetSessionTop5PicksResponse } from '../application/use-cases/get-session-top5-picks.use-case';
import { GetQimelaOpenQuestionsUseCase, GetQimelaOpenQuestionsResponse } from '../application/use-cases/get-qimela-open-questions.use-case';
import { AnswerOpenQuestionUseCase, AnswerOpenQuestionResponse } from '../application/use-cases/answer-open-question.use-case';
import { CurrentUser, CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { GetQimelasRequestDto } from './dtos/get-qimelas-request.dto';
import { CreateQimelaRequestDto } from './dtos/create-qimela-request.dto';
import { UpdateQimelaRequestDto } from './dtos/update-qimela-request.dto';
import { SavePicksRequestDto } from './dtos/save-picks-request.dto';
import { CreateLabelRequestDto } from './dtos/create-label-request.dto';
import { AnswerOpenQuestionRequestDto } from './dtos/answer-open-question-request.dto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller('qimelas')
export class QimelaController {

  constructor(
    @InjectPinoLogger(QimelaController.name) private readonly logger: PinoLogger,
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
    private readonly subscribeToQimela: SubscribeToQimelaUseCase,
    private readonly getQimelaSubscribers: GetQimelaSubscribersUseCase,
    private readonly removeSubscription: RemoveSubscriptionUseCase,
    private readonly createQimelaLabel: CreateQimelaLabelUseCase,
    private readonly deleteQimelaLabel: DeleteQimelaLabelUseCase,
    private readonly getQimelaLabels: GetQimelaLabelsUseCase,
    private readonly applyLabel: ApplyLabelUseCase,
    private readonly removeLabel: RemoveLabelUseCase,
    private readonly getSessionTop5Picks: GetSessionTop5PicksUseCase,
    private readonly getQimelaOpenQuestions: GetQimelaOpenQuestionsUseCase,
    private readonly answerOpenQuestion: AnswerOpenQuestionUseCase,
  ) {}

  @Get()
  async getQimelas(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetQimelasRequestDto,
  ): Promise<PaginatedQimelaResponse> {
    this.logger.info(`GET /qimelas requested by user ${user.id}`);
    return this.getQimelasForUser.execute({ userId: user.id, status: query.status });
  }

  @Get('sports')
  async getSports(): Promise<GetSportsForQimelaResponse> {
    this.logger.info('GET /qimelas/sports requested');
    return this.getSportsForQimela.execute();
  }

  @Get('sports/:sportId/events')
  async getEvents(
    @Param('sportId', ParseUUIDPipe) sportId: string,
  ): Promise<GetEventsForQimelaResponse> {
    this.logger.info(`GET /qimelas/sports/${sportId}/events requested`);
    return this.getEventsForQimela.execute(sportId);
  }

  @Get('rules')
  async listRules(): Promise<GetRulesResponse> {
    this.logger.info('GET /qimelas/rules requested');
    return this.getRules.execute();
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetQimelaByIdResponse> {
    this.logger.info(`GET /qimelas/${id} requested by user ${user.id}`);
    return this.getQimelaById.execute(id, user.id);
  }

  @Post(':id/subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<SubscribeToQimelaResponse> {
    this.logger.info(`POST /qimelas/${id}/subscribe requested by user ${user.id}`);
    return this.subscribeToQimela.execute({ qimelaId: id, userId: user.id });
  }

  @Get(':id/subscribers')
  async listSubscribers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ): Promise<GetQimelaSubscribersResponse> {
    this.logger.info(`GET /qimelas/${id}/subscribers requested by user ${user.id}`);
    return this.getQimelaSubscribers.execute({
      qimelaId: id,
      requesterId: user.id,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 10)),
      search: search?.trim() || undefined,
    });
  }

  @Delete(':id/subscribers/:userId')
  @HttpCode(HttpStatus.OK)
  async removeSubscriber(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<RemoveSubscriptionResponse> {
    this.logger.info(`DELETE /qimelas/${id}/subscribers/${userId} requested by user ${user.id}`);
    return this.removeSubscription.execute({
      qimelaId: id,
      requesterId: user.id,
      targetUserId: userId,
    });
  }

  @Get(':id/labels')
  async listLabels(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetQimelaLabelsResponse> {
    this.logger.info(`GET /qimelas/${id}/labels requested by user ${user.id}`);
    return this.getQimelaLabels.execute({ qimelaId: id, requesterId: user.id });
  }

  @Post(':id/labels')
  @HttpCode(HttpStatus.CREATED)
  async createLabel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: CreateLabelRequestDto,
  ): Promise<CreateQimelaLabelResponse> {
    this.logger.info(`POST /qimelas/${id}/labels requested by user ${user.id}`);
    return this.createQimelaLabel.execute({ qimelaId: id, requesterId: user.id, name: body.name, color: body.color });
  }

  @Delete(':id/labels/:labelId')
  @HttpCode(HttpStatus.OK)
  async deleteLabel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<DeleteQimelaLabelResponse> {
    this.logger.info(`DELETE /qimelas/${id}/labels/${labelId} requested by user ${user.id}`);
    return this.deleteQimelaLabel.execute({ qimelaId: id, requesterId: user.id, labelId });
  }

  @Post(':id/subscribers/:userId/labels/:labelId')
  @HttpCode(HttpStatus.OK)
  async applyLabelToSubscriber(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApplyLabelResponse> {
    this.logger.info(`POST /qimelas/${id}/subscribers/${userId}/labels/${labelId} by user ${user.id}`);
    return this.applyLabel.execute({ qimelaId: id, requesterId: user.id, targetUserId: userId, labelId });
  }

  @Delete(':id/subscribers/:userId/labels/:labelId')
  @HttpCode(HttpStatus.OK)
  async removeLabelFromSubscriber(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<RemoveLabelResponse> {
    this.logger.info(`DELETE /qimelas/${id}/subscribers/${userId}/labels/${labelId} by user ${user.id}`);
    return this.removeLabel.execute({ qimelaId: id, requesterId: user.id, targetUserId: userId, labelId });
  }

  @Get(':qimelaId/leaderboard')
  async listLeaderboard(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('phaseId') phaseId?: string,
  ): Promise<GetLeaderboardResponse> {
    this.logger.info(`GET /qimelas/${qimelaId}/leaderboard requested by user ${user.id}`);
    return this.getLeaderboard.execute(qimelaId, user.id, phaseId);
  }

  @Get(':qimelaId/phases')
  async listPhases(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetQimelaPhasesResponse> {
    this.logger.info(`GET /qimelas/${qimelaId}/phases requested by user ${user.id}`);
    return this.getQimelaPhases.execute({ qimelaId, userId: user.id });
  }

  @Get(':qimelaId/results')
  async listResults(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('phaseId', ParseUUIDPipe) phaseId: string,
    @Query('userIds') userIds?: string,
  ): Promise<GetQimelaResultsResponse> {
    this.logger.info(`GET /qimelas/${qimelaId}/results requested by user ${user.id}`);
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
    this.logger.info(`GET /qimelas/${qimelaId}/sessions/upcoming requested by user ${user.id}`);
    return this.getUpcomingSessions.execute({ qimelaId, userId: user.id });
  }

  @Get(':qimelaId/open-questions')
  async listOpenQuestions(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetQimelaOpenQuestionsResponse> {
    this.logger.info(`GET /qimelas/${qimelaId}/open-questions requested by user ${user.id}`);
    return this.getQimelaOpenQuestions.execute({ qimelaId, userId: user.id });
  }

  @Post(':qimelaId/open-questions/:questionId/response')
  @HttpCode(HttpStatus.OK)
  async submitOpenQuestionAnswer(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: AnswerOpenQuestionRequestDto,
  ): Promise<AnswerOpenQuestionResponse> {
    this.logger.info(`POST /qimelas/${qimelaId}/open-questions/${questionId}/response requested by user ${user.id}`);
    return this.answerOpenQuestion.execute({
      qimelaId,
      questionId,
      userId: user.id,
      answer: body.answer,
    });
  }

  @Get(':qimelaId/sessions')
  async getSessions(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<GetAllSessionsResponse> {
    this.logger.info(`GET /qimelas/${qimelaId}/sessions requested by user ${user.id}`);
    return this.getAllSessions.execute({ qimelaId, userId: user.id });
  }

  @Get(':qimelaId/sessions/:sessionId/top5-picks')
  async getSessionTop5(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('phaseId') phaseId?: string,
  ): Promise<GetSessionTop5PicksResponse> {
    this.logger.info(`GET /qimelas/${qimelaId}/sessions/${sessionId}/top5-picks requested by user ${user.id}`);
    return this.getSessionTop5Picks.execute(qimelaId, sessionId, user.id, phaseId);
  }

  @Post(':qimelaId/sessions/:sessionId/picks')
  @HttpCode(HttpStatus.OK)
  async savePicks(
    @Param('qimelaId', ParseUUIDPipe) qimelaId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: SavePicksRequestDto,
  ): Promise<SaveSessionPicksResponse> {
    this.logger.info(`POST /qimelas/${qimelaId}/sessions/${sessionId}/picks requested by user ${user.id}`);
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
    this.logger.info(`PATCH /qimelas/${id} requested by user ${user.id}`);
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
    this.logger.info(`POST /qimelas requested by user ${user.id}`);
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
