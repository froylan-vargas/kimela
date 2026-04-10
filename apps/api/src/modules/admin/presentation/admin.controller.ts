import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
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
  GetSessionsByPhaseUseCase,
  GetSessionsByPhaseResponse,
} from '../application/use-cases/get-sessions-by-phase.use-case';
import {
  UploadSessionsUseCase,
  UploadSessionsResponse,
} from '../application/use-cases/upload-sessions.use-case';
import { GetEventsRequestDto } from './dtos/get-events-request.dto';
import { CreatePhaseRequestDto } from './dtos/create-phase-request.dto';
import { ReorderPhasesRequestDto } from './dtos/reorder-phases-request.dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly getSports: GetSportsUseCase,
    private readonly getActiveEventsBySport: GetActiveEventsBySportUseCase,
    private readonly getPhasesByEvent: GetPhasesByEventUseCase,
    private readonly createPhase: CreatePhaseUseCase,
    private readonly reorderPhases: ReorderPhasesUseCase,
    private readonly deletePhase: DeletePhaseUseCase,
    private readonly getSessionsByPhase: GetSessionsByPhaseUseCase,
    private readonly uploadSessions: UploadSessionsUseCase,
  ) {}

  @Get('sports')
  async listSports(): Promise<GetSportsResponse> {
    this.logger.log('GET /admin/sports requested');

    return this.getSports.execute();
  }

  @Get('events')
  async listEvents(@Query() query: GetEventsRequestDto): Promise<GetActiveEventsBySportResponse> {
    this.logger.log(`GET /admin/events requested for sport ${query.sportId}`);

    return this.getActiveEventsBySport.execute({ sportId: query.sportId });
  }

  @Get('events/:eventId/phases')
  async listPhases(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<GetPhasesByEventResponse> {
    this.logger.log(`GET /admin/events/${eventId}/phases requested`);

    return this.getPhasesByEvent.execute({ eventId });
  }

  @Post('events/:eventId/phases')
  async addPhase(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: CreatePhaseRequestDto,
  ): Promise<CreatePhaseResponse> {
    this.logger.log(`POST /admin/events/${eventId}/phases requested`);

    return this.createPhase.execute({ eventId, name: body.name, type: body.type });
  }

  @Patch('events/:eventId/phases/reorder')
  async reorder(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: ReorderPhasesRequestDto,
  ): Promise<ReorderPhasesResponse> {
    this.logger.log(`PATCH /admin/events/${eventId}/phases/reorder requested`);

    return this.reorderPhases.execute({ phases: body.phases });
  }

  @Delete('events/:eventId/phases/:phaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePhase(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
  ): Promise<void> {
    this.logger.log(`DELETE /admin/events/${eventId}/phases/${phaseId} requested`);
    await this.deletePhase.execute({ id: phaseId });
  }

  @Get('events/:eventId/phases/:phaseId/sessions')
  async listSessions(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
  ): Promise<GetSessionsByPhaseResponse> {
    this.logger.log(`GET /admin/events/${eventId}/phases/${phaseId}/sessions requested`);

    return this.getSessionsByPhase.execute({ phaseId });
  }

  @Post('events/:eventId/phases/:phaseId/sessions/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSessionsCsv(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadSessionsResponse> {
    this.logger.log(`POST /admin/events/${eventId}/phases/${phaseId}/sessions/upload requested`);

    if (!file) {
      throw new BadRequestException('A CSV file is required');
    }

    return this.uploadSessions.execute({
      eventId,
      phaseId,
      fileBuffer: file.buffer,
    });
  }
}
