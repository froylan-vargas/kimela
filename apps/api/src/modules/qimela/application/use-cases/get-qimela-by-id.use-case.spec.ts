import { NotFoundException } from '@nestjs/common';
import { GetQimelaByIdUseCase } from './get-qimela-by-id.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SPORT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const LEAGUE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const makeQimela = (overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {}): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: 'Test Qimela',
    status: QimelaStatus.UPCOMING,
    sportId: SPORT_ID,
    eventId: EVENT_ID,
    leagueId: LEAGUE_ID,
    creatorId: CREATOR_ID,
    rules: [],
    startPhaseId: 'phase-1',
    endPhaseId: 'phase-2',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('GetQimelaByIdUseCase', () => {
  let useCase: GetQimelaByIdUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockPrisma: {
    phase: { findMany: jest.Mock };
    qimelaRule: { findMany: jest.Mock };
    subscription: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      phase: { findMany: jest.fn().mockResolvedValue([]) },
      qimelaRule: { findMany: jest.fn().mockResolvedValue([]) },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetQimelaByIdUseCase(mockLogger, mockQimelaRepository, mockPrisma as unknown as PrismaService);
  });

  describe('execute', () => {
    it('throws NotFoundException when qimela does not exist', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(useCase.execute(QIMELA_ID, CREATOR_ID)).rejects.toThrow(NotFoundException);
    });

    it('looks up qimela by the provided id', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());

      // Act
      await useCase.execute(QIMELA_ID, CREATOR_ID);

      // Assert
      expect(mockQimelaRepository.findById).toHaveBeenCalledWith(QIMELA_ID);
    });

    it('returns all qimela fields in the response', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());

      // Act
      const result = await useCase.execute(QIMELA_ID, CREATOR_ID);

      // Assert
      expect(result.data).toEqual({
        id: QIMELA_ID,
        name: 'Test Qimela',
        sportId: SPORT_ID,
        status: QimelaStatus.UPCOMING,
        creatorId: CREATOR_ID,
        eventId: EVENT_ID,
        leagueId: LEAGUE_ID,
        startPhaseId: 'phase-1',
        endPhaseId: 'phase-2',
        isSubscribed: false,
        phases: [],
        rules: [],
      });
    });

    it('returns null phase ids when qimela has no assigned phases', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ startPhaseId: null, endPhaseId: null }),
      );

      // Act
      const result = await useCase.execute(QIMELA_ID, CREATOR_ID);

      // Assert
      expect(result.data.startPhaseId).toBeNull();
      expect(result.data.endPhaseId).toBeNull();
    });
  });
});
