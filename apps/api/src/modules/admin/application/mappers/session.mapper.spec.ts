import { SessionMapper } from './session.mapper';
import { SessionEntity } from '../../domain/session.entity';

const makeSession = (overrides: Partial<ConstructorParameters<typeof SessionEntity>[0]> = {}): SessionEntity =>
  new SessionEntity({
    id: 'session-1',
    name: 'Team A vs Team B',
    scheduledAt: new Date('2026-04-19T20:00:00.000Z'),
    status: 'SCHEDULED',
    phaseId: 'phase-1',
    sportId: 'sport-1',
    home: { id: 'contender-1', name: 'Team A', imgUrl: 'https://example.com/a.png' },
    away: { id: 'contender-2', name: 'Team B', imgUrl: null },
    score: { home: null, away: null },
    ...overrides,
  });

describe('SessionMapper', () => {
  describe('toDto', () => {
    it('correctly maps a SessionEntity to SessionDto', () => {
      // Arrange
      const entity = makeSession();

      // Act
      const dto = SessionMapper.toDto(entity);

      // Assert
      expect(dto).toEqual({
        id: 'session-1',
        name: 'Team A vs Team B',
        scheduledAt: '2026-04-19T20:00:00.000Z',
        status: 'SCHEDULED',
        home: { id: 'contender-1', name: 'Team A', imgUrl: 'https://example.com/a.png' },
        away: { id: 'contender-2', name: 'Team B', imgUrl: null },
        score: { home: null, away: null },
      });
    });

    it('converts scheduledAt Date to ISO string', () => {
      // Arrange
      const entity = makeSession({ scheduledAt: new Date('2026-06-15T15:30:00.000Z') });

      // Act
      const dto = SessionMapper.toDto(entity);

      // Assert
      expect(dto.scheduledAt).toBe('2026-06-15T15:30:00.000Z');
    });

    it('maps null imgUrl for home contender', () => {
      // Arrange
      const entity = makeSession({
        home: { id: 'contender-1', name: 'Team A', imgUrl: null },
      });

      // Act
      const dto = SessionMapper.toDto(entity);

      // Assert
      expect(dto.home.imgUrl).toBeNull();
    });

    it('maps different session statuses correctly', () => {
      // Arrange
      const entity = makeSession({ status: 'COMPLETED' });

      // Act
      const dto = SessionMapper.toDto(entity);

      // Assert
      expect(dto.status).toBe('COMPLETED');
    });

    it('maps completed scores when present', () => {
      const entity = makeSession({
        status: 'COMPLETED',
        score: { home: '2', away: '1' },
      });

      const dto = SessionMapper.toDto(entity);

      expect(dto.score).toEqual({ home: '2', away: '1' });
    });
  });

  describe('toDtoList', () => {
    it('maps an array of SessionEntity to SessionDto[]', () => {
      // Arrange
      const entities = [
        makeSession({ id: 'session-1', name: 'Match 1' }),
        makeSession({ id: 'session-2', name: 'Match 2' }),
      ];

      // Act
      const dtos = SessionMapper.toDtoList(entities);

      // Assert
      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe('session-1');
      expect(dtos[1].id).toBe('session-2');
    });

    it('returns empty array when given an empty array', () => {
      // Arrange & Act
      const dtos = SessionMapper.toDtoList([]);

      // Assert
      expect(dtos).toEqual([]);
    });
  });
});
