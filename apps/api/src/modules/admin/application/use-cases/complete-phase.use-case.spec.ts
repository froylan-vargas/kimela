import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CompletePhaseUseCase } from './complete-phase.use-case';
import { PhaseRepository } from '../../domain/phase.repository';
import { PhaseEntity } from '../../domain/phase.entity';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const makePhase = (overrides: Partial<PhaseEntity> = {}): PhaseEntity =>
  new PhaseEntity({
    id: 'phase-1',
    name: 'Group Stage',
    order: 1,
    type: 'REGULAR_SEASON',
    status: 'ACTIVE',
    eventId: 'event-1',
    ...overrides,
  });

describe('CompletePhaseUseCase', () => {
  let useCase: CompletePhaseUseCase;
  let mockPhaseRepository: jest.Mocked<PhaseRepository>;
  let mockPrisma: {
    session: { count: jest.Mock };
    qimela: { updateMany: jest.Mock };
  };

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
      session: { count: jest.fn() },
      qimela: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    useCase = new CompletePhaseUseCase(mockPhaseRepository, mockPrisma as unknown as PrismaService);
  });

  describe('execute', () => {
    it('throws NotFoundException when phase does not exist', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(useCase.execute({ phaseId: 'phase-1' })).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when phase status is UPCOMING', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'UPCOMING' }));

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

    it('throws UnprocessableEntityException when phase has SCHEDULED sessions', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'ACTIVE' }));
      mockPrisma.session.count.mockResolvedValue(2);

      // Act + Assert
      await expect(useCase.execute({ phaseId: 'phase-1' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('checks for SCHEDULED and LIVE blocking sessions', async () => {
      // Arrange
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'ACTIVE' }));
      mockPrisma.session.count.mockResolvedValue(1);

      // Act (will throw, but we just verify the query)
      await useCase.execute({ phaseId: 'phase-1' }).catch(() => {});

      // Assert
      expect(mockPrisma.session.count).toHaveBeenCalledWith({
        where: { phaseId: 'phase-1', status: { in: ['SCHEDULED', 'LIVE'] } },
      });
    });

    it('updates phase status to COMPLETED when no blocking sessions exist', async () => {
      // Arrange
      const updatedPhase = makePhase({ status: 'COMPLETED' });
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'ACTIVE' }));
      mockPrisma.session.count.mockResolvedValue(0);
      mockPhaseRepository.updateStatus.mockResolvedValue(updatedPhase);

      // Act
      await useCase.execute({ phaseId: 'phase-1' });

      // Assert
      expect(mockPhaseRepository.updateStatus).toHaveBeenCalledWith('phase-1', 'COMPLETED');
    });

    it('updates associated ACTIVE qimelas to COMPLETED when endPhaseId matches', async () => {
      // Arrange
      const updatedPhase = makePhase({ status: 'COMPLETED' });
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'ACTIVE' }));
      mockPrisma.session.count.mockResolvedValue(0);
      mockPhaseRepository.updateStatus.mockResolvedValue(updatedPhase);

      // Act
      await useCase.execute({ phaseId: 'phase-1' });

      // Assert
      expect(mockPrisma.qimela.updateMany).toHaveBeenCalledWith({
        where: { endPhaseId: 'phase-1', status: 'ACTIVE' },
        data: { status: 'COMPLETED' },
      });
    });

    it('returns PhaseDto with COMPLETED status on success', async () => {
      // Arrange
      const updatedPhase = makePhase({ status: 'COMPLETED' });
      mockPhaseRepository.findById.mockResolvedValue(makePhase({ status: 'ACTIVE' }));
      mockPrisma.session.count.mockResolvedValue(0);
      mockPhaseRepository.updateStatus.mockResolvedValue(updatedPhase);

      // Act
      const result = await useCase.execute({ phaseId: 'phase-1' });

      // Assert
      expect(result.data.status).toBe('COMPLETED');
      expect(result.data.id).toBe('phase-1');
    });
  });
});
