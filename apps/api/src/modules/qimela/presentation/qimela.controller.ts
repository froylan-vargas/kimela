import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { GetQimelasForUserUseCase } from '../application/use-cases/get-qimelas-for-user.use-case';
import { GetQimelaByIdUseCase, GetQimelaByIdResponse } from '../application/use-cases/get-qimela-by-id.use-case';
import { GetSportsForQimelaUseCase, GetSportsForQimelaResponse } from '../application/use-cases/get-sports-for-qimela.use-case';
import { GetEventsForQimelaUseCase, GetEventsForQimelaResponse } from '../application/use-cases/get-events-for-qimela.use-case';
import { GetRulesUseCase, GetRulesResponse } from '../application/use-cases/get-rules.use-case';
import { CreateQimelaUseCase, CreateQimelaResponse } from '../application/use-cases/create-qimela.use-case';
import { UpdateQimelaUseCase, UpdateQimelaResponse } from '../application/use-cases/update-qimela.use-case';
import { PaginatedQimelaResponse } from '../application/dtos/qimela.dto';
import { CurrentUser, CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { GetQimelasRequestDto } from './dtos/get-qimelas-request.dto';
import { CreateQimelaRequestDto } from './dtos/create-qimela-request.dto';
import { UpdateQimelaRequestDto } from './dtos/update-qimela-request.dto';

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
