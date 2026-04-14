import { DeletePhaseUseCase } from './delete-phase.use-case';
import { PhaseRepository } from '../../domain/phase.repository';

describe('DeletePhaseUseCase', () => {
  let useCase: DeletePhaseUseCase;
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

    useCase = new DeletePhaseUseCase(mockPhaseRepository);
  });

  describe('execute', () => {
    it('calls delete with the given phase id', async () => {
      // Arrange
      mockPhaseRepository.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ id: 'phase-1' });

      // Assert
      expect(mockPhaseRepository.delete).toHaveBeenCalledWith('phase-1');
      expect(mockPhaseRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('resolves without error when delete succeeds', async () => {
      // Arrange
      mockPhaseRepository.delete.mockResolvedValue(undefined);

      // Act & Assert
      await expect(useCase.execute({ id: 'phase-2' })).resolves.toBeUndefined();
    });
  });
});
