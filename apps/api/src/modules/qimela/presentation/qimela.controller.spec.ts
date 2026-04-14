import { Test, TestingModule } from '@nestjs/testing';
import { QimelaController } from './qimela.controller';
import { GetQimelasForUserUseCase } from '../application/use-cases/get-qimelas-for-user.use-case';
import { GetQimelaByIdUseCase } from '../application/use-cases/get-qimela-by-id.use-case';
import { GetSportsForQimelaUseCase } from '../application/use-cases/get-sports-for-qimela.use-case';
import { GetEventsForQimelaUseCase } from '../application/use-cases/get-events-for-qimela.use-case';
import { GetRulesUseCase } from '../application/use-cases/get-rules.use-case';
import { CreateQimelaUseCase } from '../application/use-cases/create-qimela.use-case';
import { UpdateQimelaUseCase } from '../application/use-cases/update-qimela.use-case';
import { QIMELA_REPOSITORY } from '../domain/qimela.repository';
import { RULE_REPOSITORY } from '../domain/rule.repository';
import { QimelaStatus } from '../domain/qimela-status.enum';
import { CoveredStages } from '../domain/covered-stages.enum';
import { PaginatedQimelaResponse } from '../application/dtos/qimela.dto';
import { CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user-role.enum';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const MOCK_USER_ID = 'e471c62d-6015-4ab9-b930-79db54ea75c0';
const QIMELA_ID = 'f1234567-0000-0000-0000-000000000000';
const SPORT_ID = 'a1234567-0000-0000-0000-000000000000';

const MOCK_USER: CurrentUserPayload = {
  id: MOCK_USER_ID,
  email: 'test@example.com',
  role: UserRole.USER,
  emailVerifiedAt: null,
};

const mockPaginatedResponse: PaginatedQimelaResponse = {
  data: [
    {
      id: 'qimela-1',
      name: 'Test Qimela',
      sportId: SPORT_ID,
      status: QimelaStatus.ACTIVE,
      role: 'CREATOR',
      creatorId: MOCK_USER_ID,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ],
  meta: { total: 1 },
};

describe('QimelaController', () => {
  let controller: QimelaController;
  let getQimelasForUser: jest.Mocked<GetQimelasForUserUseCase>;
  let getQimelaById: jest.Mocked<GetQimelaByIdUseCase>;
  let getSportsForQimela: jest.Mocked<GetSportsForQimelaUseCase>;
  let getEventsForQimela: jest.Mocked<GetEventsForQimelaUseCase>;
  let getRules: jest.Mocked<GetRulesUseCase>;
  let createQimela: jest.Mocked<CreateQimelaUseCase>;
  let updateQimela: jest.Mocked<UpdateQimelaUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QimelaController],
      providers: [
        { provide: GetQimelasForUserUseCase, useValue: { execute: jest.fn() } },
        { provide: GetQimelaByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: GetSportsForQimelaUseCase, useValue: { execute: jest.fn() } },
        { provide: GetEventsForQimelaUseCase, useValue: { execute: jest.fn() } },
        { provide: GetRulesUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateQimelaUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateQimelaUseCase, useValue: { execute: jest.fn() } },
        { provide: QIMELA_REPOSITORY, useValue: {} },
        { provide: RULE_REPOSITORY, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<QimelaController>(QimelaController);
    getQimelasForUser = module.get(GetQimelasForUserUseCase);
    getQimelaById = module.get(GetQimelaByIdUseCase);
    getSportsForQimela = module.get(GetSportsForQimelaUseCase);
    getEventsForQimela = module.get(GetEventsForQimelaUseCase);
    getRules = module.get(GetRulesUseCase);
    createQimela = module.get(CreateQimelaUseCase);
    updateQimela = module.get(UpdateQimelaUseCase);
  });

  // ─── getQimelas ──────────────────────────────────────────────────────────

  describe('getQimelas', () => {
    it('calls use case with user id and no status filter', async () => {
      // Arrange
      getQimelasForUser.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getQimelas(MOCK_USER, {});

      // Assert
      expect(getQimelasForUser.execute).toHaveBeenCalledWith({
        userId: MOCK_USER_ID,
        status: undefined,
      });
    });

    it('calls use case with status filter when provided', async () => {
      // Arrange
      getQimelasForUser.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      await controller.getQimelas(MOCK_USER, { status: QimelaStatus.ACTIVE });

      // Assert
      expect(getQimelasForUser.execute).toHaveBeenCalledWith({
        userId: MOCK_USER_ID,
        status: QimelaStatus.ACTIVE,
      });
    });

    it('returns paginated response from use case', async () => {
      // Arrange
      getQimelasForUser.execute.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getQimelas(MOCK_USER, {});

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('returns empty data when use case returns no qimelas', async () => {
      // Arrange
      const emptyResponse: PaginatedQimelaResponse = { data: [], meta: { total: 0 } };
      getQimelasForUser.execute.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.getQimelas(MOCK_USER, {});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  // ─── getById ─────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('calls use case with the provided id', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: QIMELA_ID,
          name: 'Test',
          sportId: SPORT_ID,
          status: QimelaStatus.UPCOMING,
          creatorId: MOCK_USER_ID,
          eventId: null,
          leagueId: null,
          coveredStages: CoveredStages.REGULAR_SEASON,
          startPhaseId: null,
          endPhaseId: null,
        },
      };
      getQimelaById.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.getById(QIMELA_ID);

      // Assert
      expect(getQimelaById.execute).toHaveBeenCalledWith(QIMELA_ID);
    });

    it('returns the qimela from the use case', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: QIMELA_ID,
          name: 'Test',
          sportId: SPORT_ID,
          status: QimelaStatus.UPCOMING,
          creatorId: MOCK_USER_ID,
          eventId: null,
          leagueId: null,
          coveredStages: CoveredStages.REGULAR_SEASON,
          startPhaseId: null,
          endPhaseId: null,
        },
      };
      getQimelaById.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getById(QIMELA_ID);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── getSports ───────────────────────────────────────────────────────────

  describe('getSports', () => {
    it('calls use case and returns the result', async () => {
      // Arrange
      const mockResponse = { data: [{ id: SPORT_ID, name: 'Soccer', imgUrl: null, sessionFormat: 'MATCHUP' as const }] };
      getSportsForQimela.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getSports();

      // Assert
      expect(getSportsForQimela.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── getEvents ───────────────────────────────────────────────────────────

  describe('getEvents', () => {
    it('calls use case with the provided sportId', async () => {
      // Arrange
      const mockResponse = { data: [] };
      getEventsForQimela.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.getEvents(SPORT_ID);

      // Assert
      expect(getEventsForQimela.execute).toHaveBeenCalledWith(SPORT_ID);
    });

    it('returns events from the use case', async () => {
      // Arrange
      const mockResponse = { data: [] };
      getEventsForQimela.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getEvents(SPORT_ID);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── listRules ───────────────────────────────────────────────────────────

  describe('listRules', () => {
    it('calls use case and returns the result', async () => {
      // Arrange
      const mockResponse = {
        data: [
          { id: 'rule-1', slug: 'winner', question: 'Who wins?', sessionFormat: 'MATCHUP' as const, minPoints: 0, maxPoints: 5 },
        ],
      };
      getRules.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.listRules();

      // Assert
      expect(getRules.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('calls use case with id, requesterId, and body fields', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: QIMELA_ID,
          name: 'Updated Name',
          status: QimelaStatus.UPCOMING,
          coveredStages: CoveredStages.REGULAR_SEASON,
          startPhaseId: null,
          endPhaseId: null,
        },
      };
      updateQimela.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.update(QIMELA_ID, MOCK_USER, { name: 'Updated Name' });

      // Assert
      expect(updateQimela.execute).toHaveBeenCalledWith({
        id: QIMELA_ID,
        requesterId: MOCK_USER_ID,
        name: 'Updated Name',
        coveredStages: undefined,
      });
    });

    it('returns updated qimela from use case', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: QIMELA_ID,
          name: 'Updated Name',
          status: QimelaStatus.UPCOMING,
          coveredStages: CoveredStages.REGULAR_SEASON,
          startPhaseId: null,
          endPhaseId: null,
        },
      };
      updateQimela.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.update(QIMELA_ID, MOCK_USER, { name: 'Updated Name' });

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    const EVENT_ID = 'e1234567-0000-0000-0000-000000000000';
    const LEAGUE_ID = 'b1234567-0000-0000-0000-000000000000';
    const RULE_ID = 'c1234567-0000-0000-0000-000000000000';

    it('calls use case with creatorId from current user and all body fields', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: QIMELA_ID,
          name: 'My Pool',
          sportId: SPORT_ID,
          status: QimelaStatus.UPCOMING,
          creatorId: MOCK_USER_ID,
          eventId: EVENT_ID,
          leagueId: LEAGUE_ID,
          coveredStages: CoveredStages.REGULAR_SEASON,
          startPhaseId: null,
          endPhaseId: null,
        },
      };
      createQimela.execute.mockResolvedValue(mockResponse);

      const body = {
        name: 'My Pool',
        sportId: SPORT_ID,
        eventId: EVENT_ID,
        leagueId: LEAGUE_ID,
        coveredStages: CoveredStages.REGULAR_SEASON,
        rules: [{ ruleId: RULE_ID, points: 3 }],
      };

      // Act
      await controller.create(MOCK_USER, body as any);

      // Assert
      expect(createQimela.execute).toHaveBeenCalledWith({
        creatorId: MOCK_USER_ID,
        name: 'My Pool',
        sportId: SPORT_ID,
        eventId: EVENT_ID,
        leagueId: LEAGUE_ID,
        coveredStages: CoveredStages.REGULAR_SEASON,
        rules: [{ ruleId: RULE_ID, points: 3 }],
      });
    });

    it('returns the created qimela from use case', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: QIMELA_ID,
          name: 'My Pool',
          sportId: SPORT_ID,
          status: QimelaStatus.UPCOMING,
          creatorId: MOCK_USER_ID,
          eventId: EVENT_ID,
          leagueId: LEAGUE_ID,
          coveredStages: CoveredStages.REGULAR_SEASON,
          startPhaseId: null,
          endPhaseId: null,
        },
      };
      createQimela.execute.mockResolvedValue(mockResponse);

      const body = {
        name: 'My Pool',
        sportId: SPORT_ID,
        eventId: EVENT_ID,
        leagueId: LEAGUE_ID,
        coveredStages: CoveredStages.REGULAR_SEASON,
        rules: [{ ruleId: RULE_ID, points: 3 }],
      };

      // Act
      const result = await controller.create(MOCK_USER, body as any);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });
});
