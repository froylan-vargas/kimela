import { CreatePhaseUseCase } from './create-phase.use-case';
import { PhaseRepository } from '../../domain/phase.repository';
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

describe('CreatePhaseUseCase', () => {
  let useCase: CreatePhaseUseCase;
  let mockPhaseRepository: jest.Mocked<PhaseRepository>;

  beforeEach(() => {
    mockPhaseRepository = {
      findByEvent: jest.fn(),
      getMaxOrderForEvent: jest.fn(),
      create: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new CreatePhaseUseCase(mockPhaseRepository);
  });

  describe('execute', () => {
    it('creates phase with order = maxOrder + 1 when phases already exist', async () => {
      // Arrange
      const maxOrder = 3;
      const createdPhase = makePhase({ id: 'phase-4', name: 'Final', order: 4, type: 'PLAYOFFS' });
      mockPhaseRepository.getMaxOrderForEvent.mockResolvedValue(maxOrder);
      mockPhaseRepository.create.mockResolvedValue(createdPhase);

      // Act
      const result = await useCase.execute({ eventId: 'event-1', name: 'Final', type: 'PLAYOFFS' });

      // Assert
      expect(mockPhaseRepository.getMaxOrderForEvent).toHaveBeenCalledWith('event-1');
      expect(mockPhaseRepository.create).toHaveBeenCalledWith({
        eventId: 'event-1',
        name: 'Final',
        type: 'PLAYOFFS',
      });
      expect(result.data).toEqual({
        id: 'phase-4',
        name: 'Final',
        order: 4,
        type: 'PLAYOFFS',
        eventId: 'event-1',
      });
    });

    it('creates first phase with order 1 when no phases exist (maxOrder = 0)', async () => {
      // Arrange
      const createdPhase = makePhase({ id: 'phase-1', name: 'Group Stage', order: 1 });
      mockPhaseRepository.getMaxOrderForEvent.mockResolvedValue(0);
      mockPhaseRepository.create.mockResolvedValue(createdPhase);

      // Act
      const result = await useCase.execute({ eventId: 'event-1', name: 'Group Stage', type: 'REGULAR_SEASON' });

      // Assert
      expect(mockPhaseRepository.getMaxOrderForEvent).toHaveBeenCalledWith('event-1');
      expect(mockPhaseRepository.create).toHaveBeenCalledWith({
        eventId: 'event-1',
        name: 'Group Stage',
        type: 'REGULAR_SEASON',
      });
      expect(result.data.order).toBe(1);
    });
  });
});
