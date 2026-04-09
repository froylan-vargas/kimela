import { QimelaMapper } from './qimela.mapper';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';

const makeEntity = (overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {}): QimelaEntity => {
  return new QimelaEntity({
    id: 'qimela-1',
    name: 'Liga Domingo',
    description: 'Quiniela dominical',
    sport: 'football',
    status: QimelaStatus.ACTIVE,
    creatorId: 'creator-uuid',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });
};

describe('QimelaMapper', () => {
  describe('toDto', () => {
    it('assigns role CREATOR when userId matches creatorId', () => {
      // Arrange
      const entity = makeEntity({ creatorId: 'user-abc' });
      const userId = 'user-abc';

      // Act
      const dto = QimelaMapper.toDto(entity, userId);

      // Assert
      expect(dto.role).toBe('CREATOR');
    });

    it('assigns role SUBSCRIBER when userId does not match creatorId', () => {
      // Arrange
      const entity = makeEntity({ creatorId: 'creator-uuid' });
      const userId = 'subscriber-uuid';

      // Act
      const dto = QimelaMapper.toDto(entity, userId);

      // Assert
      expect(dto.role).toBe('SUBSCRIBER');
    });

    it('maps all entity fields to dto correctly', () => {
      // Arrange
      const entity = makeEntity();
      const userId = 'any-user';

      // Act
      const dto = QimelaMapper.toDto(entity, userId);

      // Assert
      expect(dto.id).toBe(entity.id);
      expect(dto.name).toBe(entity.name);
      expect(dto.description).toBe(entity.description);
      expect(dto.sport).toBe(entity.sport);
      expect(dto.status).toBe(entity.status);
      expect(dto.creatorId).toBe(entity.creatorId);
      expect(dto.createdAt).toBe(entity.createdAt);
      expect(dto.updatedAt).toBe(entity.updatedAt);
    });

    it('maps null description correctly', () => {
      // Arrange
      const entity = makeEntity({ description: null });
      const userId = 'any-user';

      // Act
      const dto = QimelaMapper.toDto(entity, userId);

      // Assert
      expect(dto.description).toBeNull();
    });
  });

  describe('toDtoList', () => {
    it('returns empty array when no entities provided', () => {
      // Arrange
      const entities: QimelaEntity[] = [];
      const userId = 'any-user';

      // Act
      const dtos = QimelaMapper.toDtoList(entities, userId);

      // Assert
      expect(dtos).toEqual([]);
    });

    it('maps multiple entities correctly', () => {
      // Arrange
      const entities = [
        makeEntity({ id: '1', creatorId: 'user-abc' }),
        makeEntity({ id: '2', creatorId: 'other-user' }),
      ];
      const userId = 'user-abc';

      // Act
      const dtos = QimelaMapper.toDtoList(entities, userId);

      // Assert
      expect(dtos).toHaveLength(2);
      expect(dtos[0].role).toBe('CREATOR');
      expect(dtos[1].role).toBe('SUBSCRIBER');
    });
  });
});
