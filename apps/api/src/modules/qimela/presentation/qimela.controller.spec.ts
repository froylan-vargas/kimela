import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { QimelaController } from './qimela.controller';
import { GetQimelasForUserUseCase } from '../application/use-cases/get-qimelas-for-user.use-case';
import { GetQimelaByIdUseCase } from '../application/use-cases/get-qimela-by-id.use-case';
import { GetSportsForQimelaUseCase } from '../application/use-cases/get-sports-for-qimela.use-case';
import { GetEventsForQimelaUseCase } from '../application/use-cases/get-events-for-qimela.use-case';
import { GetRulesUseCase } from '../application/use-cases/get-rules.use-case';
import { CreateQimelaUseCase } from '../application/use-cases/create-qimela.use-case';
import { UpdateQimelaUseCase } from '../application/use-cases/update-qimela.use-case';
import { GetUpcomingSessionsUseCase } from '../application/use-cases/get-upcoming-sessions.use-case';
import { GetAllSessionsUseCase } from '../application/use-cases/get-all-sessions.use-case';
import { SaveSessionPicksUseCase } from '../application/use-cases/save-session-picks.use-case';
import { GetLeaderboardUseCase } from '../application/use-cases/get-leaderboard.use-case';
import { GetQimelaPhasesUseCase } from '../application/use-cases/get-qimela-phases.use-case';
import { GetQimelaResultsUseCase } from '../application/use-cases/get-qimela-results.use-case';
import { SubscribeToQimelaUseCase } from '../application/use-cases/subscribe-to-qimela.use-case';
import { GetQimelaSubscribersUseCase } from '../application/use-cases/get-qimela-subscribers.use-case';
import { RemoveSubscriptionUseCase } from '../application/use-cases/remove-subscription.use-case';
import { CreateQimelaLabelUseCase } from '../application/use-cases/create-qimela-label.use-case';
import { DeleteQimelaLabelUseCase } from '../application/use-cases/delete-qimela-label.use-case';
import { GetQimelaLabelsUseCase } from '../application/use-cases/get-qimela-labels.use-case';
import { ApplyLabelUseCase } from '../application/use-cases/apply-label.use-case';
import { RemoveLabelUseCase } from '../application/use-cases/remove-label.use-case';
import { QIMELA_REPOSITORY } from '../domain/qimela.repository';
import { RULE_REPOSITORY } from '../domain/rule.repository';
import { QimelaStatus } from '../domain/qimela-status.enum';
import { PaginatedQimelaResponse } from '../application/dtos/qimela.dto';
import { SavePicksRequestDto } from './dtos/save-picks-request.dto';
import { CreateQimelaRequestDto } from './dtos/create-qimela-request.dto';
import { CurrentUserPayload } from '../../auth/presentation/decorators/current-user.decorator';
import { UserRole } from '../../users/domain/user-role.enum';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const MOCK_USER_ID = 'e471c62d-6015-4ab9-b930-79db54ea75c0';
const QIMELA_ID = 'f1234567-0000-0000-0000-000000000000';
const SPORT_ID = 'a1234567-0000-0000-0000-000000000000';
const LABEL_ID = 'e1111111-1111-1111-1111-111111111111';
const TARGET_USER_ID = 'f2222222-2222-2222-2222-222222222222';

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
  let getUpcomingSessions: jest.Mocked<GetUpcomingSessionsUseCase>;
  let getAllSessions: jest.Mocked<GetAllSessionsUseCase>;
  let saveSessionPicks: jest.Mocked<SaveSessionPicksUseCase>;
  let getLeaderboard: jest.Mocked<GetLeaderboardUseCase>;
  let createQimelaLabel: jest.Mocked<CreateQimelaLabelUseCase>;
  let deleteQimelaLabel: jest.Mocked<DeleteQimelaLabelUseCase>;
  let getQimelaLabels: jest.Mocked<GetQimelaLabelsUseCase>;
  let applyLabel: jest.Mocked<ApplyLabelUseCase>;
  let removeLabel: jest.Mocked<RemoveLabelUseCase>;

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
        { provide: GetUpcomingSessionsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAllSessionsUseCase, useValue: { execute: jest.fn() } },
        { provide: SaveSessionPicksUseCase, useValue: { execute: jest.fn() } },
        { provide: GetLeaderboardUseCase, useValue: { execute: jest.fn() } },
        { provide: GetQimelaPhasesUseCase, useValue: { execute: jest.fn() } },
        { provide: GetQimelaResultsUseCase, useValue: { execute: jest.fn() } },
        { provide: SubscribeToQimelaUseCase, useValue: { execute: jest.fn() } },
        { provide: GetQimelaSubscribersUseCase, useValue: { execute: jest.fn() } },
        { provide: RemoveSubscriptionUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateQimelaLabelUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteQimelaLabelUseCase, useValue: { execute: jest.fn() } },
        { provide: GetQimelaLabelsUseCase,   useValue: { execute: jest.fn() } },
        { provide: ApplyLabelUseCase,        useValue: { execute: jest.fn() } },
        { provide: RemoveLabelUseCase,       useValue: { execute: jest.fn() } },
        { provide: QIMELA_REPOSITORY, useValue: {} },
        { provide: RULE_REPOSITORY, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: getLoggerToken(QimelaController.name), useValue: { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() } },
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
    getUpcomingSessions = module.get(GetUpcomingSessionsUseCase);
    getAllSessions = module.get(GetAllSessionsUseCase);
    saveSessionPicks = module.get(SaveSessionPicksUseCase);
    getLeaderboard = module.get(GetLeaderboardUseCase);
    createQimelaLabel = module.get(CreateQimelaLabelUseCase);
    deleteQimelaLabel = module.get(DeleteQimelaLabelUseCase);
    getQimelaLabels   = module.get(GetQimelaLabelsUseCase);
    applyLabel        = module.get(ApplyLabelUseCase);
    removeLabel       = module.get(RemoveLabelUseCase);
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
    it('calls use case with the provided id and user id', async () => {
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
          startPhaseId: null,
          endPhaseId: null,
          isSubscribed: false,
          phases: [],
          rules: [],
        },
      };
      getQimelaById.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.getById(QIMELA_ID, MOCK_USER);

      // Assert
      expect(getQimelaById.execute).toHaveBeenCalledWith(QIMELA_ID, MOCK_USER_ID);
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
          startPhaseId: null,
          endPhaseId: null,
          isSubscribed: false,
          phases: [],
          rules: [],
        },
      };
      getQimelaById.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getById(QIMELA_ID, MOCK_USER);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUpcoming', () => {
    it('delegates to use case with qimelaId and userId', async () => {
      getUpcomingSessions.execute.mockResolvedValue({ data: [] });

      await controller.getUpcoming(QIMELA_ID, MOCK_USER);

      expect(getUpcomingSessions.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        userId: MOCK_USER_ID,
      });
    });
  });

  describe('listLeaderboard', () => {
    it('delegates to the leaderboard use case with the qimela id', async () => {
      const response = { data: [] };
      getLeaderboard.execute.mockResolvedValue(response);

      const result = await controller.listLeaderboard(QIMELA_ID);

      expect(getLeaderboard.execute).toHaveBeenCalledWith(QIMELA_ID, undefined);
      expect(result).toEqual(response);
    });
  });

  describe('getSessions', () => {
    it('delegates to use case with qimelaId and userId', async () => {
      getAllSessions.execute.mockResolvedValue({ data: [] });

      await controller.getSessions(QIMELA_ID, MOCK_USER);

      expect(getAllSessions.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        userId: MOCK_USER_ID,
      });
    });
  });

  describe('savePicks', () => {
    it('delegates to use case with qimelaId, sessionId, userId and picks', async () => {
      saveSessionPicks.execute.mockResolvedValue({
        data: { sessionId: 'session-1', picks: [] },
      });

      const body: SavePicksRequestDto = {
        picks: [{ pickCategoryId: 'cat-1', value: '2' }],
      };

      await controller.savePicks(QIMELA_ID, 'session-1', MOCK_USER, body);

      expect(saveSessionPicks.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        sessionId: 'session-1',
        userId: MOCK_USER_ID,
        picks: [{ pickCategoryId: 'cat-1', value: '2', pickedContenderId: null }],
      });
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
        initialPhaseId: undefined,
        finalPhaseId: undefined,
        rules: undefined,
      });
    });

    it('returns updated qimela from use case', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: QIMELA_ID,
          name: 'Updated Name',
          status: QimelaStatus.UPCOMING,
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
    const INITIAL_PHASE_ID = 'd1234567-0000-0000-0000-000000000000';
    const FINAL_PHASE_ID = 'e2234567-0000-0000-0000-000000000000';

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
          startPhaseId: INITIAL_PHASE_ID,
          endPhaseId: FINAL_PHASE_ID,
        },
      };
      createQimela.execute.mockResolvedValue(mockResponse);

      const body: CreateQimelaRequestDto = {
        name: 'My Pool',
        sportId: SPORT_ID,
        eventId: EVENT_ID,
        leagueId: LEAGUE_ID,
        initialPhaseId: INITIAL_PHASE_ID,
        finalPhaseId: FINAL_PHASE_ID,
        rules: [{ ruleId: RULE_ID, points: 3 }],
      };

      // Act
      await controller.create(MOCK_USER, body);

      // Assert
      expect(createQimela.execute).toHaveBeenCalledWith({
        creatorId: MOCK_USER_ID,
        name: 'My Pool',
        sportId: SPORT_ID,
        eventId: EVENT_ID,
        leagueId: LEAGUE_ID,
        initialPhaseId: INITIAL_PHASE_ID,
        finalPhaseId: FINAL_PHASE_ID,
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
          startPhaseId: INITIAL_PHASE_ID,
          endPhaseId: FINAL_PHASE_ID,
        },
      };
      createQimela.execute.mockResolvedValue(mockResponse);

      const body: CreateQimelaRequestDto = {
        name: 'My Pool',
        sportId: SPORT_ID,
        eventId: EVENT_ID,
        leagueId: LEAGUE_ID,
        initialPhaseId: INITIAL_PHASE_ID,
        finalPhaseId: FINAL_PHASE_ID,
        rules: [{ ruleId: RULE_ID, points: 3 }],
      };

      // Act
      const result = await controller.create(MOCK_USER, body);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── listLabels ───────────────────────────────────────────────────────────

  describe('listLabels', () => {
    it('calls getQimelaLabels.execute with qimelaId and requesterId', async () => {
      // Arrange
      const mockResponse = { data: { labels: [] } };
      getQimelaLabels.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.listLabels(QIMELA_ID, MOCK_USER);

      // Assert
      expect(getQimelaLabels.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        requesterId: MOCK_USER_ID,
      });
    });

    it('returns result from use case', async () => {
      // Arrange
      const mockResponse = {
        data: {
          labels: [{ id: LABEL_ID, name: 'VIP', color: '#ff0000' }],
        },
      };
      getQimelaLabels.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.listLabels(QIMELA_ID, MOCK_USER);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── createLabel ──────────────────────────────────────────────────────────

  describe('createLabel', () => {
    it('calls createQimelaLabel.execute with qimelaId, requesterId, name, and color', async () => {
      // Arrange
      const mockResponse = { data: { id: LABEL_ID, name: 'VIP', color: '#ff0000' } };
      createQimelaLabel.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.createLabel(QIMELA_ID, MOCK_USER, { name: 'VIP', color: '#ff0000' });

      // Assert
      expect(createQimelaLabel.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        requesterId: MOCK_USER_ID,
        name: 'VIP',
        color: '#ff0000',
      });
    });

    it('returns created label from use case', async () => {
      // Arrange
      const mockResponse = { data: { id: LABEL_ID, name: 'VIP', color: '#ff0000' } };
      createQimelaLabel.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.createLabel(QIMELA_ID, MOCK_USER, { name: 'VIP', color: '#ff0000' });

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── deleteLabel ──────────────────────────────────────────────────────────

  describe('deleteLabel', () => {
    it('calls deleteQimelaLabel.execute with qimelaId, requesterId, and labelId', async () => {
      // Arrange
      const mockResponse = { data: { deleted: true } };
      deleteQimelaLabel.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.deleteLabel(QIMELA_ID, LABEL_ID, MOCK_USER);

      // Assert
      expect(deleteQimelaLabel.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        requesterId: MOCK_USER_ID,
        labelId: LABEL_ID,
      });
    });

    it('returns { data: { deleted: true } }', async () => {
      // Arrange
      const mockResponse = { data: { deleted: true } };
      deleteQimelaLabel.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.deleteLabel(QIMELA_ID, LABEL_ID, MOCK_USER);

      // Assert
      expect(result).toEqual({ data: { deleted: true } });
    });
  });

  // ─── applyLabelToSubscriber ───────────────────────────────────────────────

  describe('applyLabelToSubscriber', () => {
    it('calls applyLabel.execute with qimelaId, requesterId, targetUserId, and labelId', async () => {
      // Arrange
      const mockResponse = { data: { applied: true } };
      applyLabel.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.applyLabelToSubscriber(QIMELA_ID, TARGET_USER_ID, LABEL_ID, MOCK_USER);

      // Assert
      expect(applyLabel.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        requesterId: MOCK_USER_ID,
        targetUserId: TARGET_USER_ID,
        labelId: LABEL_ID,
      });
    });

    it('returns { data: { applied: true } }', async () => {
      // Arrange
      const mockResponse = { data: { applied: true } };
      applyLabel.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.applyLabelToSubscriber(QIMELA_ID, TARGET_USER_ID, LABEL_ID, MOCK_USER);

      // Assert
      expect(result).toEqual({ data: { applied: true } });
    });
  });

  // ─── removeLabelFromSubscriber ────────────────────────────────────────────

  describe('removeLabelFromSubscriber', () => {
    it('calls removeLabel.execute with qimelaId, requesterId, targetUserId, and labelId', async () => {
      // Arrange
      const mockResponse = { data: { removed: true } };
      removeLabel.execute.mockResolvedValue(mockResponse);

      // Act
      await controller.removeLabelFromSubscriber(QIMELA_ID, TARGET_USER_ID, LABEL_ID, MOCK_USER);

      // Assert
      expect(removeLabel.execute).toHaveBeenCalledWith({
        qimelaId: QIMELA_ID,
        requesterId: MOCK_USER_ID,
        targetUserId: TARGET_USER_ID,
        labelId: LABEL_ID,
      });
    });

    it('returns { data: { removed: true } }', async () => {
      // Arrange
      const mockResponse = { data: { removed: true } };
      removeLabel.execute.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.removeLabelFromSubscriber(QIMELA_ID, TARGET_USER_ID, LABEL_ID, MOCK_USER);

      // Assert
      expect(result).toEqual({ data: { removed: true } });
    });
  });
});
