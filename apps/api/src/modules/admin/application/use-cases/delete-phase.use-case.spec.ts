import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
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

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new DeletePhaseUseCase(mockLogger, mockPhaseRepository);
  });

  describe('execute', () => {
    it('calls delete with the given phase id', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue({
        id: 'phase-1',
        name: 'Phase 1',
        order: 1,
        type: 'OTHER',
        status: 'UPCOMING',
        eventId: 'event-1',
      });
      mockPhaseRepository.delete.mockResolvedValue(undefined);

      // Act
      await useCase.execute({ id: 'phase-1' });

      // Assert
      expect(mockPhaseRepository.delete).toHaveBeenCalledWith('phase-1');
      expect(mockPhaseRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('resolves without error when delete succeeds', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue({
        id: 'phase-2',
        name: 'Phase 2',
        order: 2,
        type: 'OTHER',
        status: 'UPCOMING',
        eventId: 'event-1',
      });
      mockPhaseRepository.delete.mockResolvedValue(undefined);

      // Act & Assert
      await expect(useCase.execute({ id: 'phase-2' })).resolves.toBeUndefined();
    });

    it('throws NotFoundException when phase does not exist', async () => {
      mockPhaseRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute({ id: 'missing-phase' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPhaseRepository.delete).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when phase status is ACTIVE', async () => {
      mockPhaseRepository.findById.mockResolvedValue({
        id: 'phase-3',
        name: 'Phase 3',
        order: 3,
        type: 'OTHER',
        status: 'ACTIVE',
        eventId: 'event-1',
      });

      await expect(useCase.execute({ id: 'phase-3' })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(mockPhaseRepository.delete).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when phase status is COMPLETED', async () => {
      mockPhaseRepository.findById.mockResolvedValue({
        id: 'phase-4',
        name: 'Phase 4',
        order: 4,
        type: 'OTHER',
        status: 'COMPLETED',
        eventId: 'event-1',
      });

      await expect(useCase.execute({ id: 'phase-4' })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(mockPhaseRepository.delete).not.toHaveBeenCalled();
    });
  });
});
