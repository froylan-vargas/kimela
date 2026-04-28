import { GetSessionsByPhaseUseCase } from './get-sessions-by-phase.use-case';
import { SessionRepository } from '../../domain/session.repository';
import { SessionEntity } from '../../domain/session.entity';

const makeSession = (overrides: Partial<ConstructorParameters<typeof SessionEntity>[0]> = {}): SessionEntity =>
  new SessionEntity({
    id: 'session-1',
    name: 'Match 1',
    scheduledAt: new Date('2026-04-15T20:00:00Z'),
    status: 'SCHEDULED',
    phaseId: 'phase-1',
    sportId: 'sport-1',
    home: { id: 'contender-1', name: 'Team A', imgUrl: 'https://example.com/a.png' },
    away: { id: 'contender-2', name: 'Team B', imgUrl: null },
    score: { home: null, away: null },
    ...overrides,
  });

describe('GetSessionsByPhaseUseCase', () => {
  let useCase: GetSessionsByPhaseUseCase;
  let mockSessionRepository: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    mockSessionRepository = {
      findByPhase: jest.fn(),
      replaceForPhase: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetSessionsByPhaseUseCase(mockLogger, mockSessionRepository);
  });

  describe('execute', () => {
    it('returns mapped session DTOs for the given phaseId', async () => {
      // Arrange
      const sessions = [
        makeSession({ id: 'session-1', name: 'Match 1' }),
        makeSession({ id: 'session-2', name: 'Match 2' }),
      ];
      mockSessionRepository.findByPhase.mockResolvedValue(sessions);

      // Act
      const result = await useCase.execute({ phaseId: 'phase-1' });

      // Assert
      expect(mockSessionRepository.findByPhase).toHaveBeenCalledWith({ phaseId: 'phase-1' });
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'session-1',
        name: 'Match 1',
        scheduledAt: new Date('2026-04-15T20:00:00Z').toISOString(),
        status: 'SCHEDULED',
        home: { id: 'contender-1', name: 'Team A', imgUrl: 'https://example.com/a.png' },
        away: { id: 'contender-2', name: 'Team B', imgUrl: null },
        score: { home: null, away: null },
      });
    });

    it('returns empty array when no sessions exist for the phase', async () => {
      // Arrange
      mockSessionRepository.findByPhase.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ phaseId: 'phase-99' });

      // Assert
      expect(result.data).toEqual([]);
    });
  });
});
