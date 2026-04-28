import { GetPhasesByEventUseCase } from './get-phases-by-event.use-case';
import { PhaseRepository } from '../../domain/phase.repository';
import { PhaseEntity } from '../../domain/phase.entity';

const makePhase = (overrides: Partial<ConstructorParameters<typeof PhaseEntity>[0]> = {}): PhaseEntity =>
  new PhaseEntity({
    id: 'phase-1',
    name: 'Group Stage',
    order: 1,
    type: 'REGULAR_SEASON',
    status: 'UPCOMING',
    eventId: 'event-1',
    ...overrides,
  });

describe('GetPhasesByEventUseCase', () => {
  let useCase: GetPhasesByEventUseCase;
  let mockPhaseRepository: jest.Mocked<PhaseRepository>;

  beforeEach(() => {
    mockPhaseRepository = {
      findByEvent: jest.fn(),
      getMaxOrderForEvent: jest.fn(),
      create: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
      updateStatus: jest.fn(),
      findById: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetPhasesByEventUseCase(mockLogger, mockPhaseRepository);
  });

  describe('execute', () => {
    it('returns mapped phase DTOs sorted by order', async () => {
      // Arrange
      const phases = [
        makePhase({ id: 'phase-1', name: 'Group Stage', order: 1 }),
        makePhase({ id: 'phase-2', name: 'Quarter Finals', order: 2 }),
        makePhase({ id: 'phase-3', name: 'Final', order: 3, type: 'PLAYOFFS' }),
      ];
      mockPhaseRepository.findByEvent.mockResolvedValue(phases);

      // Act
      const result = await useCase.execute({ eventId: 'event-1' });

      // Assert
      expect(mockPhaseRepository.findByEvent).toHaveBeenCalledWith({ eventId: 'event-1' });
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        id: 'phase-1',
        name: 'Group Stage',
        order: 1,
        type: 'REGULAR_SEASON',
        status: 'UPCOMING',
        eventId: 'event-1',
      });
      expect(result.data[2]).toEqual({
        id: 'phase-3',
        name: 'Final',
        order: 3,
        type: 'PLAYOFFS',
        status: 'UPCOMING',
        eventId: 'event-1',
      });
    });

    it('returns empty array when no phases exist for the event', async () => {
      // Arrange
      mockPhaseRepository.findByEvent.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({ eventId: 'event-99' });

      // Assert
      expect(result.data).toEqual([]);
    });
  });
});
