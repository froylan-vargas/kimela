import { PhasePersistenceMapper } from './phase-persistence.mapper';
import { PhaseEntity } from '../../domain/phase.entity';

// Mirrors the Prisma Phase model shape
interface PrismaPhase {
  id: string;
  name: string;
  order: number;
  type: string;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
}

const makeRawPhase = (overrides: Partial<PrismaPhase> = {}): PrismaPhase => ({
  id: 'phase-1',
  name: 'Group Stage',
  order: 1,
  type: 'REGULAR_SEASON',
  eventId: 'event-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('PhasePersistenceMapper', () => {
  describe('toDomain', () => {
    it('correctly maps a Prisma phase record to PhaseEntity', () => {
      // Arrange
      const raw = makeRawPhase();

      // Act
      const entity = PhasePersistenceMapper.toDomain(raw as any);

      // Assert
      expect(entity).toBeInstanceOf(PhaseEntity);
      expect(entity.id).toBe('phase-1');
      expect(entity.name).toBe('Group Stage');
      expect(entity.order).toBe(1);
      expect(entity.type).toBe('REGULAR_SEASON');
      expect(entity.eventId).toBe('event-1');
    });

    it('maps PLAYOFFS type correctly', () => {
      // Arrange
      const raw = makeRawPhase({ type: 'PLAYOFFS', order: 2, name: 'Quarter Finals' });

      // Act
      const entity = PhasePersistenceMapper.toDomain(raw as any);

      // Assert
      expect(entity.type).toBe('PLAYOFFS');
      expect(entity.order).toBe(2);
      expect(entity.name).toBe('Quarter Finals');
    });

    it('maps OTHER type correctly', () => {
      // Arrange
      const raw = makeRawPhase({ type: 'OTHER' });

      // Act
      const entity = PhasePersistenceMapper.toDomain(raw as any);

      // Assert
      expect(entity.type).toBe('OTHER');
    });

    it('does not include Prisma-only fields (createdAt, updatedAt) on the entity', () => {
      // Arrange
      const raw = makeRawPhase();

      // Act
      const entity = PhasePersistenceMapper.toDomain(raw as any);

      // Assert
      expect((entity as any).createdAt).toBeUndefined();
      expect((entity as any).updatedAt).toBeUndefined();
    });
  });
});
