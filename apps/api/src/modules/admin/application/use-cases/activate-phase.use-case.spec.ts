import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ActivatePhaseUseCase } from './activate-phase.use-case';
import { PhaseRepository } from '../../domain/phase.repository';
import { PhaseEntity } from '../../domain/phase.entity';

const makePhase = (overrides: Partial<PhaseEntity> = {}): PhaseEntity =>
  new PhaseEntity({
    id: 'phase-1',
    name: 'Group Stage',
    order: 1,
    type: 'REGULAR_SEASON',
    status: 'UPCOMING',
    eventId: 'event-1',
    ...overrides,
  });

describe('ActivatePhaseUseCase', () => {
  let useCase: ActivatePhaseUseCase;
  let mockPhaseRepository: jest.Mocked<PhaseRepository>;
  let mockPrisma: { qimela: { updateMany: jest.Mock } };

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

    mockPrisma = {
      qimela: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    useCase = new ActivatePhaseUseCase(mockPhaseRepository, mockPrisma as any);
  });

  describe('execute', () => {
    it('throws NotFoundException when phase does not exist', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(useCase.execute({ phaseId: 'phase-1' })).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when phase status is ACTIVE', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'ACTIVE' }));

      // Act + Assert
      await expect(useCase.execute({ phaseId: 'phase-1' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when phase status is COMPLETED', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'COMPLETED' }));

      // Act + Assert
      await expect(useCase.execute({ phaseId: 'phase-1' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('updates phase status to ACTIVE when current status is UPCOMING', async () => {
      // Arrange
      const updatedPhase = makePhase({ status: 'ACTIVE' });
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'UPCOMING' }));
      mockPhaseRepository.updateStatus.mockResolvedValue(updatedPhase);

      // Act
      await useCase.execute({ phaseId: 'phase-1' });

      // Assert
      expect(mockPhaseRepository.updateStatus).toHaveBeenCalledWith('phase-1', 'ACTIVE');
    });

    it('updates associated UPCOMING qimelas to ACTIVE status', async () => {
      // Arrange
      const updatedPhase = makePhase({ status: 'ACTIVE' });
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'UPCOMING' }));
      mockPhaseRepository.updateStatus.mockResolvedValue(updatedPhase);

      // Act
      await useCase.execute({ phaseId: 'phase-1' });

      // Assert
      expect(mockPrisma.qimela.updateMany).toHaveBeenCalledWith({
        where: { startPhaseId: 'phase-1', status: 'UPCOMING' },
        data: { status: 'ACTIVE' },
      });
    });

    it('returns PhaseDto with ACTIVE status on success', async () => {
      // Arrange
      const updatedPhase = makePhase({ status: 'ACTIVE' });
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'UPCOMING' }));
      mockPhaseRepository.updateStatus.mockResolvedValue(updatedPhase);

      // Act
      const result = await useCase.execute({ phaseId: 'phase-1' });

      // Assert
      expect(result.data.status).toBe('ACTIVE');
      expect(result.data.id).toBe('phase-1');
    });
  });
});
