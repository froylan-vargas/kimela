import { BadRequestException, Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository, SessionRow } from '../../domain/session.repository';
import { SessionDto } from '../dtos/session.dto';
import { SessionMapper } from '../mappers/session.mapper';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const REQUIRED_HEADERS = ['equipo_local', 'equipo_visitante', 'fecha', 'hora'] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

export interface UploadSessionsCommand {
  eventId: string;
  phaseId: string;
  fileBuffer: Buffer;
}

export interface UploadSessionsResponse {
  data: SessionDto[];
}

interface CsvRow {
  equipo_local: string;
  equipo_visitante: string;
  fecha: string;
  hora: string;
}

@Injectable()
export class UploadSessionsUseCase {
  private readonly logger = new Logger(UploadSessionsUseCase.name);

  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: UploadSessionsCommand): Promise<UploadSessionsResponse> {
    this.logger.log(`Uploading sessions for phase ${command.phaseId} of event ${command.eventId}`);

    const phase = await this.prisma.phase.findUnique({
      where: { id: command.phaseId },
      select: { status: true },
    });

    if (!phase) {
      throw new NotFoundException(`Phase ${command.phaseId} not found`);
    }

    if (phase.status !== 'UPCOMING') {
      throw new UnprocessableEntityException({
        code: 'PHASE_MUST_BE_UPCOMING_FOR_UPLOAD',
        message: 'Sessions can only be uploaded to an upcoming phase.',
      });
    }

    const csvRows = this.parseCsv(command.fileBuffer);

    const rows: SessionRow[] = csvRows.map((row, index) => {
      const lineNumber = index + 2; // +1 for header, +1 for 1-based index

      if (!row.equipo_local.trim()) {
        throw new BadRequestException(`Row ${lineNumber}: equipo_local is required`);
      }
      if (!row.equipo_visitante.trim()) {
        throw new BadRequestException(`Row ${lineNumber}: equipo_visitante is required`);
      }
      if (!DATE_REGEX.test(row.fecha)) {
        throw new BadRequestException(
          `Row ${lineNumber}: fecha "${row.fecha}" is invalid, expected format YYYY-MM-DD`,
        );
      }
      if (!TIME_REGEX.test(row.hora)) {
        throw new BadRequestException(
          `Row ${lineNumber}: hora "${row.hora}" is invalid, expected format HH:mm`,
        );
      }

      const scheduledAt = new Date(`${row.fecha}T${row.hora}:00.000Z`);
      if (isNaN(scheduledAt.getTime())) {
        throw new BadRequestException(
          `Row ${lineNumber}: could not parse date/time "${row.fecha} ${row.hora}"`,
        );
      }

      return {
        homeName: row.equipo_local.trim(),
        awayName: row.equipo_visitante.trim(),
        scheduledAt,
      };
    });

    this.logger.log(`Parsed ${rows.length} rows from CSV`);

    const sessions = await this.sessionRepository.replaceForPhase({
      phaseId: command.phaseId,
      eventId: command.eventId,
      sportId: '',
      rows,
    });

    this.logger.log(`Replaced sessions for phase ${command.phaseId}, created ${sessions.length} sessions`);

    return { data: SessionMapper.toDtoList(sessions) };
  }

  private parseCsv(buffer: Buffer): CsvRow[] {
    const content = buffer.toString('utf-8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    const headers = lines[0].split(',').map((h) => h.trim());

    for (const required of REQUIRED_HEADERS) {
      if (!headers.includes(required)) {
        throw new BadRequestException(`CSV is missing required header: "${required}"`);
      }
    }

    const headerIndexes: Record<string, number> = {};
    for (const header of REQUIRED_HEADERS) {
      headerIndexes[header] = headers.indexOf(header);
    }

    const dataLines = lines.slice(1);

    if (dataLines.length === 0) {
      throw new BadRequestException('CSV file has no data rows');
    }

    return dataLines.map((line, index) => {
      const cells = line.split(',').map((c) => c.trim());
      const lineNumber = index + 2;

      const get = (field: string): string => {
        const value = cells[headerIndexes[field]];
        if (value === undefined || value === '') {
          throw new BadRequestException(`Row ${lineNumber}: field "${field}" is missing or empty`);
        }
        return value;
      };

      return {
        equipo_local: get('equipo_local'),
        equipo_visitante: get('equipo_visitante'),
        fecha: get('fecha'),
        hora: get('hora'),
      };
    });
  }
}
