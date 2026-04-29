import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user-role.enum';
import { GetSportsUseCase, GetSportsResponse } from '../application/use-cases/get-sports.use-case';
import {
  GetActiveEventsBySportUseCase,
  GetActiveEventsBySportResponse,
} from '../application/use-cases/get-active-events-by-sport.use-case';
import {
  GetPhasesByEventUseCase,
  GetPhasesByEventResponse,
} from '../application/use-cases/get-phases-by-event.use-case';
import { CreatePhaseUseCase, CreatePhaseResponse } from '../application/use-cases/create-phase.use-case';
import { ReorderPhasesUseCase, ReorderPhasesResponse } from '../application/use-cases/reorder-phases.use-case';
import { DeletePhaseUseCase } from '../application/use-cases/delete-phase.use-case';
import {
  ActivatePhaseUseCase,
  ActivatePhaseResponse,
} from '../application/use-cases/activate-phase.use-case';
import {
  CompletePhaseUseCase,
  CompletePhaseResponse,
} from '../application/use-cases/complete-phase.use-case';
import {
  GetSessionsByPhaseUseCase,
  GetSessionsByPhaseResponse,
} from '../application/use-cases/get-sessions-by-phase.use-case';
import {
  UploadSessionsUseCase,
  UploadSessionsResponse,
} from '../application/use-cases/upload-sessions.use-case';
import { SaveSessionResultsUseCase } from '../application/use-cases/save-session-results.use-case';
import { CancelSessionResultsUseCase } from '../application/use-cases/cancel-session-results.use-case';
import { CurrentUser, CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { GetEventsRequestDto } from './dtos/get-events-request.dto';
import { CreatePhaseRequestDto } from './dtos/create-phase-request.dto';
import { ReorderPhasesRequestDto } from './dtos/reorder-phases-request.dto';
import { SaveSessionResultsDto } from '../application/dtos/save-session-results.dto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {

  constructor(
    @InjectPinoLogger(AdminController.name) private readonly logger: PinoLogger,
    private readonly getSports: GetSportsUseCase,
    private readonly getActiveEventsBySport: GetActiveEventsBySportUseCase,
    private readonly getPhasesByEvent: GetPhasesByEventUseCase,
    private readonly createPhase: CreatePhaseUseCase,
    private readonly reorderPhases: ReorderPhasesUseCase,
    private readonly deletePhase: DeletePhaseUseCase,
    private readonly activatePhaseUseCase: ActivatePhaseUseCase,
    private readonly completePhaseUseCase: CompletePhaseUseCase,
    private readonly getSessionsByPhase: GetSessionsByPhaseUseCase,
    private readonly uploadSessions: UploadSessionsUseCase,
    private readonly saveSessionResultsUseCase: SaveSessionResultsUseCase,
    private readonly cancelSessionResultsUseCase: CancelSessionResultsUseCase,
  ) {}

  @Get('sports')
  async listSports(): Promise<GetSportsResponse> {
    this.logger.info('GET /admin/sports requested');

    return this.getSports.execute();
  }

  @Get('events')
  async listEvents(@Query() query: GetEventsRequestDto): Promise<GetActiveEventsBySportResponse> {
    this.logger.info(`GET /admin/events requested for sport ${query.sportId}`);

    return this.getActiveEventsBySport.execute({ sportId: query.sportId });
  }

  @Get('events/:eventId/phases')
  async listPhases(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<GetPhasesByEventResponse> {
    this.logger.info(`GET /admin/events/${eventId}/phases requested`);

    return this.getPhasesByEvent.execute({ eventId });
  }

  @Post('events/:eventId/phases')
  async addPhase(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CreatePhaseRequestDto,
  ): Promise<CreatePhaseResponse> {
    this.logger.info(`POST /admin/events/${eventId}/phases requested`);

    return this.createPhase.execute({ eventId, name: body.name, type: body.type });
  }

  @Patch('events/:eventId/phases/reorder')
  async reorder(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: ReorderPhasesRequestDto,
  ): Promise<ReorderPhasesResponse> {
    this.logger.info(`PATCH /admin/events/${eventId}/phases/reorder requested`);

    return this.reorderPhases.execute({ phases: body.phases });
  }

  @Delete('events/:eventId/phases/:phaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePhase(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
  ): Promise<void> {
    this.logger.info(`DELETE /admin/events/${eventId}/phases/${phaseId} requested`);
    await this.deletePhase.execute({ id: phaseId });
  }

  @Patch('events/:eventId/phases/:phaseId/activate')
  @HttpCode(HttpStatus.OK)
  async activatePhase(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
  ): Promise<ActivatePhaseResponse> {
    this.logger.info(`PATCH /admin/events/${eventId}/phases/${phaseId}/activate requested`);

    return this.activatePhaseUseCase.execute({ phaseId });
  }

  @Patch('events/:eventId/phases/:phaseId/complete')
  @HttpCode(HttpStatus.OK)
  async completePhase(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
  ): Promise<CompletePhaseResponse> {
    this.logger.info(`PATCH /admin/events/${eventId}/phases/${phaseId}/complete requested`);

    return this.completePhaseUseCase.execute({ phaseId });
  }

  @Get('events/:eventId/phases/:phaseId/sessions')
  async listSessions(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
  ): Promise<GetSessionsByPhaseResponse> {
    this.logger.info(`GET /admin/events/${eventId}/phases/${phaseId}/sessions requested`);

    return this.getSessionsByPhase.execute({ phaseId });
  }

  @Post('events/:eventId/phases/:phaseId/sessions/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSessionsCsv(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadSessionsResponse> {
    this.logger.info(`POST /admin/events/${eventId}/phases/${phaseId}/sessions/upload requested`);

    if (!file) {
      throw new BadRequestException('A CSV file is required');
    }

    return this.uploadSessions.execute({
      eventId,
      phaseId,
      fileBuffer: file.buffer,
    });
  }

  @Put('events/:eventId/phases/:phaseId/sessions/:sessionId/results')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveSessionResults(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: SaveSessionResultsDto,
  ): Promise<void> {
    this.logger.info(`PUT /admin/events/${eventId}/phases/${phaseId}/sessions/${sessionId}/results requested`);

    await this.saveSessionResultsUseCase.execute({ eventId, phaseId, sessionId, homeScore: body.homeScore, awayScore: body.awayScore });
  }

  @Delete('events/:eventId/phases/:phaseId/sessions/:sessionId/results')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelSessionResults(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    this.logger.info(`DELETE /admin/events/${eventId}/phases/${phaseId}/sessions/${sessionId}/results requested`);

    await this.cancelSessionResultsUseCase.execute({ eventId, phaseId, sessionId, cancelledByUserId: user.id });
  }
}
