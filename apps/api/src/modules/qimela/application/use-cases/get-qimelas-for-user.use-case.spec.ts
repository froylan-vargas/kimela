import { GetQimelasForUserUseCase } from './get-qimelas-for-user.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { GetQimelasQuery } from '../dtos/get-qimelas.query';

const makeEntity = (overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {}): QimelaEntity => {
  return new QimelaEntity({
    id: 'qimela-1',
    name: 'Liga Domingo',
    description: null,
    sport: 'football',
    status: QimelaStatus.ACTIVE,
    creatorId: 'user-uuid',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });
};

describe('GetQimelasForUserUseCase', () => {
  let useCase: GetQimelasForUserUseCase;
  let mockRepository: jest.Mocked<QimelaRepository>;

  beforeEach(() => {
    mockRepository = {
      findForUser: jest.fn(),
    };

    useCase = new GetQimelasForUserUseCase(mockRepository);
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
  });
});
