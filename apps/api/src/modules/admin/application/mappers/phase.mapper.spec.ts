import { PhaseMapper } from './phase.mapper';
import { PhaseEntity } from '../../domain/phase.entity';

const makePhase = (overrides: Partial<ConstructorParameters<typeof PhaseEntity>[0]> = {}): PhaseEntity =>
  new PhaseEntity({
    id: 'phase-1',
    name: 'Group Stage',
    order: 1,
    type: 'REGULAR_SEASON',
    eventId: 'event-1',
    ...overrides,
  });

describe('PhaseMapper', () => {
  describe('toDto', () => {
    it('correctly maps a PhaseEntity to PhaseDto', () => {
      // Arrange
      const entity = makePhase();

      // Act
      const dto = PhaseMapper.toDto(entity);

      // Assert
      expect(dto).toEqual({
        id: 'phase-1',
        name: 'Group Stage',
        order: 1,
        type: 'REGULAR_SEASON',
        eventId: 'event-1',
      });
    });

    it('maps PLAYOFFS type correctly', () => {
      // Arrange
      const entity = makePhase({ id: 'phase-2', name: 'Quarter Finals', order: 2, type: 'PLAYOFFS' });

      // Act
      const dto = PhaseMapper.toDto(entity);

      // Assert
      expect(dto.type).toBe('PLAYOFFS');
      expect(dto.order).toBe(2);
    });

    it('maps OTHER type correctly', () => {
      // Arrange
      const entity = makePhase({ type: 'OTHER' });

      // Act
      const dto = PhaseMapper.toDto(entity);

      // Assert
      expect(dto.type).toBe('OTHER');
    });
  });

  describe('toDtoList', () => {
    it('maps an array of PhaseEntity to PhaseDto[]', () => {
      // Arrange
      const entities = [
        makePhase({ id: 'phase-1', name: 'Group Stage', order: 1 }),
        makePhase({ id: 'phase-2', name: 'Quarter Finals', order: 2, type: 'PLAYOFFS' }),
        makePhase({ id: 'phase-3', name: 'Final', order: 3, type: 'PLAYOFFS' }),
      ];

      // Act
      const dtos = PhaseMapper.toDtoList(entities);

      // Assert
      expect(dtos).toHaveLength(3);
      expect(dtos[0]).toEqual({ id: 'phase-1', name: 'Group Stage', order: 1, type: 'REGULAR_SEASON', eventId: 'event-1' });
      expect(dtos[1]).toEqual({ id: 'phase-2', name: 'Quarter Finals', order: 2, type: 'PLAYOFFS', eventId: 'event-1' });
      expect(dtos[2]).toEqual({ id: 'phase-3', name: 'Final', order: 3, type: 'PLAYOFFS', eventId: 'event-1' });
    });

    it('returns empty array when given an empty array', () => {
      // Arrange & Act
      const dtos = PhaseMapper.toDtoList([]);

      // Assert
      expect(dtos).toEqual([]);
    });
  });
});
