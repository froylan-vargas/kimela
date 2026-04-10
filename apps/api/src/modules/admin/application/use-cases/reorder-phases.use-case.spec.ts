import { ReorderPhasesUseCase } from './reorder-phases.use-case';
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

describe('ReorderPhasesUseCase', () => {
  let useCase: ReorderPhasesUseCase;
  let mockPhaseRepository: jest.Mocked<PhaseRepository>;

  beforeEach(() => {
    mockPhaseRepository = {
      findByEvent: jest.fn(),
      getMaxOrderForEvent: jest.fn(),
      create: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ReorderPhasesUseCase(mockPhaseRepository);
  });

  describe('execute', () => {
    it('calls reorder with the correct items', async () => {
      // Arrange
      const items = [
        { id: 'phase-1', order: 2 },
        { id: 'phase-2', order: 1 },
      ];
      const reorderedPhases = [
        makePhase({ id: 'phase-2', name: 'Quarter Finals', order: 1 }),
        makePhase({ id: 'phase-1', name: 'Group Stage', order: 2 }),
      ];
      mockPhaseRepository.reorder.mockResolvedValue(reorderedPhases);

      // Act
      const result = await useCase.execute({ phases: items });

      // Assert
      expect(mockPhaseRepository.reorder).toHaveBeenCalledWith(items);
      expect(result.data).toHaveLength(2);
    });

    it('returns reordered phases as mapped DTOs', async () => {
      // Arrange
      const items = [
        { id: 'phase-a', order: 1 },
        { id: 'phase-b', order: 2 },
        { id: 'phase-c', order: 3 },
      ];
      const reorderedPhases = [
        makePhase({ id: 'phase-a', name: 'Phase A', order: 1 }),
        makePhase({ id: 'phase-b', name: 'Phase B', order: 2 }),
        makePhase({ id: 'phase-c', name: 'Phase C', order: 3, type: 'PLAYOFFS' }),
      ];
      mockPhaseRepository.reorder.mockResolvedValue(reorderedPhases);

      // Act
      const result = await useCase.execute({ phases: items });

      // Assert
      expect(result.data[0]).toEqual({ id: 'phase-a', name: 'Phase A', order: 1, type: 'REGULAR_SEASON', eventId: 'event-1' });
      expect(result.data[1]).toEqual({ id: 'phase-b', name: 'Phase B', order: 2, type: 'REGULAR_SEASON', eventId: 'event-1' });
      expect(result.data[2]).toEqual({ id: 'phase-c', name: 'Phase C', order: 3, type: 'PLAYOFFS', eventId: 'event-1' });
    });
  });
});
