import { SessionPersistenceMapper } from './session-persistence.mapper';
import { SessionEntity } from '../../domain/session.entity';

interface PrismaSessionContender {
  role: string | null;
  contender: {
    id: string;
    name: string;
    imgUrl: string | null;
  };
}

interface PrismaSessionWithContenders {
  id: string;
  name: string;
  scheduledAt: Date;
  status: string;
  phaseId: string;
  sportId: string;
  contenders: PrismaSessionContender[];
}

const makeRawSession = (overrides: Partial<PrismaSessionWithContenders> = {}): PrismaSessionWithContenders => ({
  id: 'session-1',
  name: 'Team A vs Team B',
  scheduledAt: new Date('2026-04-19T20:00:00.000Z'),
  status: 'SCHEDULED',
  phaseId: 'phase-1',
  sportId: 'sport-1',
  contenders: [
    {
      role: 'home',
      contender: { id: 'contender-1', name: 'Team A', imgUrl: 'https://example.com/a.png' },
    },
    {
      role: 'away',
      contender: { id: 'contender-2', name: 'Team B', imgUrl: null },
    },
  ],
  ...overrides,
});

describe('SessionPersistenceMapper', () => {
  describe('toDomain', () => {
    it('correctly maps a Prisma record with home and away contenders to SessionEntity', () => {
      // Arrange
      const raw = makeRawSession();

      // Act
      const entity = SessionPersistenceMapper.toDomain(raw);

      // Assert
      expect(entity).toBeInstanceOf(SessionEntity);
      expect(entity.id).toBe('session-1');
      expect(entity.name).toBe('Team A vs Team B');
      expect(entity.scheduledAt).toEqual(new Date('2026-04-19T20:00:00.000Z'));
      expect(entity.status).toBe('SCHEDULED');
      expect(entity.phaseId).toBe('phase-1');
      expect(entity.sportId).toBe('sport-1');
      expect(entity.home).toEqual({ id: 'contender-1', name: 'Team A', imgUrl: 'https://example.com/a.png' });
      expect(entity.away).toEqual({ id: 'contender-2', name: 'Team B', imgUrl: null });
    });

    it('maps null imgUrl for home contender correctly', () => {
      // Arrange
      const raw = makeRawSession({
        contenders: [
          { role: 'home', contender: { id: 'contender-1', name: 'Team A', imgUrl: null } },
          { role: 'away', contender: { id: 'contender-2', name: 'Team B', imgUrl: 'https://example.com/b.png' } },
        ],
      });

      // Act
      const entity = SessionPersistenceMapper.toDomain(raw);

      // Assert
      expect(entity.home.imgUrl).toBeNull();
      expect(entity.away.imgUrl).toBe('https://example.com/b.png');
    });

    it('maps null imgUrl for away contender correctly', () => {
      // Arrange
      const raw = makeRawSession({
        contenders: [
          { role: 'home', contender: { id: 'contender-1', name: 'Team A', imgUrl: 'https://example.com/a.png' } },
          { role: 'away', contender: { id: 'contender-2', name: 'Team B', imgUrl: null } },
        ],
      });

      // Act
      const entity = SessionPersistenceMapper.toDomain(raw);

      // Assert
      expect(entity.away.imgUrl).toBeNull();
    });

    it('throws when home contender is missing', () => {
      // Arrange
      const raw = makeRawSession({
        contenders: [
          { role: 'away', contender: { id: 'contender-2', name: 'Team B', imgUrl: null } },
        ],
      });

      // Act & Assert
      expect(() => SessionPersistenceMapper.toDomain(raw)).toThrow(
        `Session session-1 is missing home or away contender`,
      );
    });

    it('throws when away contender is missing', () => {
      // Arrange
      const raw = makeRawSession({
        contenders: [
          { role: 'home', contender: { id: 'contender-1', name: 'Team A', imgUrl: null } },
        ],
      });

      // Act & Assert
      expect(() => SessionPersistenceMapper.toDomain(raw)).toThrow(
        `Session session-1 is missing home or away contender`,
      );
    });

    it('throws when contenders array is empty', () => {
      // Arrange
      const raw = makeRawSession({ contenders: [] });

      // Act & Assert
      expect(() => SessionPersistenceMapper.toDomain(raw)).toThrow(Error);
    });

    it('casts the status string to SessionStatus type', () => {
      // Arrange
      const raw = makeRawSession({ status: 'LIVE' });

      // Act
      const entity = SessionPersistenceMapper.toDomain(raw);

      // Assert
      expect(entity.status).toBe('LIVE');
    });
  });
});
