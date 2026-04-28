import { GetQimelasForUserUseCase } from './get-qimelas-for-user.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { GetQimelasQuery } from '../dtos/get-qimelas.query';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const makeEntity = (overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {}): QimelaEntity => {
  return new QimelaEntity({
    id: 'qimela-1',
    name: 'Liga Domingo',
    sportId: 'sport-uuid',
    status: QimelaStatus.ACTIVE,
    creatorId: 'user-uuid',
    eventId: null,
    leagueId: null,
    rules: [],
    startPhaseId: null,
    endPhaseId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });
};

describe('GetQimelasForUserUseCase', () => {
  let useCase: GetQimelasForUserUseCase;
  let mockRepository: jest.Mocked<QimelaRepository>;
  let mockPrisma: { subscription: { findMany: jest.Mock } };

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      subscription: { findMany: jest.fn().mockResolvedValue([]) },
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetQimelasForUserUseCase(mockLogger, 
      mockRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('execute', () => {
    it('returns paginated response with data and meta when qimelas exist', async () => {
      // Arrange
      const userId = 'user-uuid';
      const entities = [
        makeEntity({ id: '1', creatorId: userId }),
        makeEntity({ id: '2', creatorId: 'other-user' }),
      ];
      mockRepository.findForUser.mockResolvedValue(entities);

      const query: GetQimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('returns empty data array and meta.total 0 when no qimelas found', async () => {
      // Arrange
      mockRepository.findForUser.mockResolvedValue([]);
      const query: GetQimelasQuery = { userId: 'user-uuid' };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('passes status filter to repository', async () => {
      // Arrange
      mockRepository.findForUser.mockResolvedValue([]);
      const query: GetQimelasQuery = { userId: 'user-uuid', status: QimelaStatus.ACTIVE };

      // Act
      await useCase.execute(query);

      // Assert
      expect(mockRepository.findForUser).toHaveBeenCalledWith({
        userId: 'user-uuid',
        status: QimelaStatus.ACTIVE,
      });
    });

    it('calls repository without status when no filter provided', async () => {
      // Arrange
      mockRepository.findForUser.mockResolvedValue([]);
      const query: GetQimelasQuery = { userId: 'user-uuid' };

      // Act
      await useCase.execute(query);

      // Assert
      expect(mockRepository.findForUser).toHaveBeenCalledWith({
        userId: 'user-uuid',
        status: undefined,
      });
    });

    it('assigns CREATOR role to qimelas where user is the creator', async () => {
      // Arrange
      const userId = 'creator-id';
      const entity = makeEntity({ creatorId: userId });
      mockRepository.findForUser.mockResolvedValue([entity]);
      const query: GetQimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data[0].role).toBe('CREATOR');
    });

    it('assigns SUBSCRIBER role to qimelas where user is not the creator', async () => {
      // Arrange
      const userId = 'subscriber-id';
      const entity = makeEntity({ creatorId: 'different-creator' });
      mockRepository.findForUser.mockResolvedValue([entity]);
      const query: GetQimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data[0].role).toBe('SUBSCRIBER');
    });

    it('returns two entries when creator is also subscribed — one CREATOR and one SUBSCRIBER', async () => {
      // Arrange
      const userId = 'creator-id';
      const qimelaId = 'qimela-1';
      const entity = makeEntity({ id: qimelaId, creatorId: userId });
      mockRepository.findForUser.mockResolvedValue([entity]);
      mockPrisma.subscription.findMany.mockResolvedValue([{ qimelaId }]);
      const query: GetQimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0].role).toBe('CREATOR');
      expect(result.data[1].role).toBe('SUBSCRIBER');
      expect(result.data[0].id).toBe(qimelaId);
      expect(result.data[1].id).toBe(qimelaId);
    });

    it('returns only CREATOR entry when creator is not subscribed', async () => {
      // Arrange
      const userId = 'creator-id';
      const entity = makeEntity({ id: 'qimela-1', creatorId: userId });
      mockRepository.findForUser.mockResolvedValue([entity]);
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      const query: GetQimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe('CREATOR');
    });
  });
});
