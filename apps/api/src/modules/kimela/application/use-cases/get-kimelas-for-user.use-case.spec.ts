import { GetKimelasForUserUseCase } from './get-kimelas-for-user.use-case';
import { KimelaRepository } from '../../domain/kimela.repository';
import { KimelaEntity } from '../../domain/kimela.entity';
import { KimelaStatus } from '../../domain/kimela-status.enum';
import { GetKimelasQuery } from '../dtos/get-kimelas.query';

const makeEntity = (overrides: Partial<ConstructorParameters<typeof KimelaEntity>[0]> = {}): KimelaEntity => {
  return new KimelaEntity({
    id: 'kimela-1',
    name: 'Liga Domingo',
    description: null,
    sport: 'football',
    status: KimelaStatus.ACTIVE,
    creatorId: 'user-uuid',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });
};

describe('GetKimelasForUserUseCase', () => {
  let useCase: GetKimelasForUserUseCase;
  let mockRepository: jest.Mocked<KimelaRepository>;

  beforeEach(() => {
    mockRepository = {
      findForUser: jest.fn(),
    };

    useCase = new GetKimelasForUserUseCase(mockRepository);
  });

  describe('execute', () => {
    it('returns paginated response with data and meta when kimelas exist', async () => {
      // Arrange
      const userId = 'user-uuid';
      const entities = [
        makeEntity({ id: '1', creatorId: userId }),
        makeEntity({ id: '2', creatorId: 'other-user' }),
      ];
      mockRepository.findForUser.mockResolvedValue(entities);

      const query: GetKimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('returns empty data array and meta.total 0 when no kimelas found', async () => {
      // Arrange
      mockRepository.findForUser.mockResolvedValue([]);
      const query: GetKimelasQuery = { userId: 'user-uuid' };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('passes status filter to repository', async () => {
      // Arrange
      mockRepository.findForUser.mockResolvedValue([]);
      const query: GetKimelasQuery = { userId: 'user-uuid', status: KimelaStatus.ACTIVE };

      // Act
      await useCase.execute(query);

      // Assert
      expect(mockRepository.findForUser).toHaveBeenCalledWith({
        userId: 'user-uuid',
        status: KimelaStatus.ACTIVE,
      });
    });

    it('calls repository without status when no filter provided', async () => {
      // Arrange
      mockRepository.findForUser.mockResolvedValue([]);
      const query: GetKimelasQuery = { userId: 'user-uuid' };

      // Act
      await useCase.execute(query);

      // Assert
      expect(mockRepository.findForUser).toHaveBeenCalledWith({
        userId: 'user-uuid',
        status: undefined,
      });
    });

    it('assigns CREATOR role to kimelas where user is the creator', async () => {
      // Arrange
      const userId = 'creator-id';
      const entity = makeEntity({ creatorId: userId });
      mockRepository.findForUser.mockResolvedValue([entity]);
      const query: GetKimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data[0].role).toBe('CREATOR');
    });

    it('assigns SUBSCRIBER role to kimelas where user is not the creator', async () => {
      // Arrange
      const userId = 'subscriber-id';
      const entity = makeEntity({ creatorId: 'different-creator' });
      mockRepository.findForUser.mockResolvedValue([entity]);
      const query: GetKimelasQuery = { userId };

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result.data[0].role).toBe('SUBSCRIBER');
    });
  });
});
