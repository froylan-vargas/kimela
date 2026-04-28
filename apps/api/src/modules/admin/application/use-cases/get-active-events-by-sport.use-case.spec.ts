import { GetActiveEventsBySportUseCase } from './get-active-events-by-sport.use-case';
import { EventRepository } from '../../domain/event.repository';
import { EventEntity } from '../../domain/event.entity';

const makeEvent = (overrides: Partial<ConstructorParameters<typeof EventEntity>[0]> = {}): EventEntity =>
  new EventEntity({
    id: 'event-1',
    name: 'Liga MX Clausura 2026',
    startsAt: new Date('2026-01-01T00:00:00Z'),
    endsAt: new Date('2026-06-30T00:00:00Z'),
    status: 'ACTIVE',
    leagueId: 'league-1',
    leagueName: 'Liga MX',
    ...overrides,
  });

describe('GetActiveEventsBySportUseCase', () => {
  let useCase: GetActiveEventsBySportUseCase;
  let mockEventRepository: jest.Mocked<EventRepository>;

  beforeEach(() => {
    mockEventRepository = {
      findActiveBySport: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetActiveEventsBySportUseCase(mockLogger, mockEventRepository);
  });

  describe('execute', () => {
    it('returns mapped event DTOs for the given sportId', async () => {
      // Arrange
      const events = [
        makeEvent({ id: 'event-1', name: 'Liga MX Clausura 2026' }),
        makeEvent({ id: 'event-2', name: 'Liga MX Apertura 2025', endsAt: null }),
      ];
      mockEventRepository.findActiveBySport.mockResolvedValue(events);

      // Act
      const result = await useCase.execute({ sportId: 'sport-1' });

      // Assert
      expect(mockEventRepository.findActiveBySport).toHaveBeenCalledWith({ sportId: 'sport-1' });
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'event-1',
        name: 'Liga MX Clausura 2026',
        startsAt: new Date('2026-01-01T00:00:00Z'),
        endsAt: new Date('2026-06-30T00:00:00Z'),
        status: 'ACTIVE',
        leagueId: 'league-1',
        leagueName: 'Liga MX',
      });
      expect(result.data[1].endsAt).toBeNull();
    });

    it('returns empty array when no active events exist for the sport', async () => {
      // Arrange
      mockEventRepository.findActiveBySport.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ sportId: 'sport-99' });

      // Assert
      expect(result.data).toEqual([]);
    });
  });
});
