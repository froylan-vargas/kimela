import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { UploadSessionsUseCase } from './upload-sessions.use-case';
import { SessionRepository } from '../../domain/session.repository';
import { SessionEntity } from '../../domain/session.entity';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const VALID_HEADERS = 'equipo_local,equipo_visitante,fecha,hora';

const makeCsvBuffer = (content: string): Buffer => Buffer.from(content, 'utf-8');

const makeValidCsv = (rows: string[] = ['Team A,Team B,2026-04-19,20:00']): Buffer =>
  makeCsvBuffer([VALID_HEADERS, ...rows].join('\n'));

const makeSession = (overrides: Partial<ConstructorParameters<typeof SessionEntity>[0]> = {}): SessionEntity =>
  new SessionEntity({
    id: 'session-1',
    name: 'Match 1',
    scheduledAt: new Date('2026-04-19T20:00:00.000Z'),
    status: 'SCHEDULED',
    phaseId: 'phase-1',
    sportId: 'sport-1',
    home: { id: 'c-1', name: 'Team A', imgUrl: null },
    away: { id: 'c-2', name: 'Team B', imgUrl: null },
    score: { home: null, away: null },
    ...overrides,
  });

describe('UploadSessionsUseCase', () => {
  let useCase: UploadSessionsUseCase;
  let mockSessionRepository: jest.Mocked<SessionRepository>;
  let mockPrisma: { phase: { findUnique: jest.Mock } };

  beforeEach(() => {
    mockSessionRepository = {
      findByPhase: jest.fn(),
      replaceForPhase: jest.fn(),
    };
    mockPrisma = { phase: { findUnique: jest.fn().mockResolvedValue({ status: 'UPCOMING' }) } };

    useCase = new UploadSessionsUseCase(mockSessionRepository, mockPrisma as unknown as PrismaService);
  });

  describe('execute', () => {
    describe('phase status validation', () => {
      it('throws NotFoundException when the phase does not exist', async () => {
        // Arrange
        mockPrisma.phase.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: makeValidCsv() }),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws UnprocessableEntityException when the phase is ACTIVE', async () => {
        // Arrange
        mockPrisma.phase.findUnique.mockResolvedValue({ status: 'ACTIVE' });

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: makeValidCsv() }),
        ).rejects.toThrow(UnprocessableEntityException);
      });

      it('throws UnprocessableEntityException when the phase is COMPLETED', async () => {
        // Arrange
        mockPrisma.phase.findUnique.mockResolvedValue({ status: 'COMPLETED' });

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: makeValidCsv() }),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('valid CSV', () => {
      it('calls replaceForPhase with correctly parsed SessionRows for a single row', async () => {
        // Arrange
        mockSessionRepository.replaceForPhase.mockResolvedValue([makeSession()]);
        const buffer = makeValidCsv(['Team A,Team B,2026-04-19,20:00']);

        // Act
        await useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer });

        // Assert
        expect(mockSessionRepository.replaceForPhase).toHaveBeenCalledWith({
          phaseId: 'phase-1',
          eventId: 'event-1',
          sportId: '',
          rows: [
            {
              homeName: 'Team A',
              awayName: 'Team B',
              scheduledAt: new Date('2026-04-19T20:00:00.000Z'),
            },
          ],
        });
      });

      it('calls replaceForPhase with correct scheduledAt values for multiple rows', async () => {
        // Arrange
        mockSessionRepository.replaceForPhase.mockResolvedValue([]);
        const buffer = makeValidCsv([
          'Team A,Team B,2026-04-19,20:00',
          'Team C,Team D,2026-04-20,15:30',
        ]);

        // Act
        await useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer });

        // Assert
        const { rows } = mockSessionRepository.replaceForPhase.mock.calls[0][0];
        expect(rows).toHaveLength(2);
        expect(rows[0].scheduledAt).toEqual(new Date('2026-04-19T20:00:00.000Z'));
        expect(rows[1].scheduledAt).toEqual(new Date('2026-04-20T15:30:00.000Z'));
        expect(rows[1].homeName).toBe('Team C');
        expect(rows[1].awayName).toBe('Team D');
      });

      it('trims whitespace from cell values', async () => {
        // Arrange
        mockSessionRepository.replaceForPhase.mockResolvedValue([]);
        const buffer = makeCsvBuffer(
          'equipo_local , equipo_visitante , fecha , hora\n  Team A  ,  Team B  , 2026-04-19 , 20:00 ',
        );

        // Act
        await useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer });

        // Assert
        const { rows } = mockSessionRepository.replaceForPhase.mock.calls[0][0];
        expect(rows[0].homeName).toBe('Team A');
        expect(rows[0].awayName).toBe('Team B');
      });

      it('returns mapped session DTOs from replaceForPhase result', async () => {
        // Arrange
        const session = makeSession();
        mockSessionRepository.replaceForPhase.mockResolvedValue([session]);
        const buffer = makeValidCsv(['Team A,Team B,2026-04-19,20:00']);

        // Act
        const result = await useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer });

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('session-1');
      });
    });

    describe('CSV validation errors', () => {
      it('throws BadRequestException when the file buffer is empty', async () => {
        // Arrange
        const buffer = makeCsvBuffer('');

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when CSV has only whitespace/blank lines', async () => {
        // Arrange
        const buffer = makeCsvBuffer('   \n   \n');

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when required header equipo_local is missing', async () => {
        // Arrange
        const buffer = makeCsvBuffer('equipo_visitante,fecha,hora\nTeam B,2026-04-19,20:00');

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when required header equipo_visitante is missing', async () => {
        // Arrange
        const buffer = makeCsvBuffer('equipo_local,fecha,hora\nTeam A,2026-04-19,20:00');

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when required header fecha is missing', async () => {
        // Arrange
        const buffer = makeCsvBuffer('equipo_local,equipo_visitante,hora\nTeam A,Team B,20:00');

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when required header hora is missing', async () => {
        // Arrange
        const buffer = makeCsvBuffer('equipo_local,equipo_visitante,fecha\nTeam A,Team B,2026-04-19');

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when CSV has only the header row and no data rows', async () => {
        // Arrange
        const buffer = makeCsvBuffer(VALID_HEADERS);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when fecha format is DD-MM-YYYY instead of YYYY-MM-DD', async () => {
        // Arrange
        const buffer = makeValidCsv(['Team A,Team B,19-04-2026,20:00']);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when fecha format contains slashes (DD/MM/YYYY)', async () => {
        // Arrange
        const buffer = makeValidCsv(['Team A,Team B,19/04/2026,20:00']);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when hora is missing leading zero (H:mm)', async () => {
        // Arrange
        const buffer = makeValidCsv(['Team A,Team B,2026-04-19,8:00']);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when hora includes seconds (HH:mm:ss)', async () => {
        // Arrange
        const buffer = makeValidCsv(['Team A,Team B,2026-04-19,20:00:00']);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when a row is missing a cell value', async () => {
        // Arrange
        // Row has equipo_local missing (empty cell)
        const buffer = makeCsvBuffer(`${VALID_HEADERS}\n,Team B,2026-04-19,20:00`);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when a row has fewer cells than headers', async () => {
        // Arrange
        const buffer = makeCsvBuffer(`${VALID_HEADERS}\nTeam A,Team B,2026-04-19`);

        // Act & Assert
        await expect(
          useCase.execute({ eventId: 'event-1', phaseId: 'phase-1', fileBuffer: buffer }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
