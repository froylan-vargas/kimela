import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UpdateQimelaUseCase, UpdateQimelaCommand } from './update-qimela.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { RuleRepository } from '../../domain/rule.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SPORT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const LEAGUE_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const PHASE_START_ID = 'phase-start-id';
const PHASE_END_ID = 'phase-end-id';
const NEW_INITIAL_PHASE_ID = 'new-initial-phase-id';
const NEW_FINAL_PHASE_ID = 'new-final-phase-id';

const makeQimela = (
  overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {},
): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: 'Original Name',
    status: QimelaStatus.UPCOMING,
    sportId: SPORT_ID,
    eventId: EVENT_ID,
    leagueId: LEAGUE_ID,
    creatorId: CREATOR_ID,
    rules: [],
    startPhaseId: PHASE_START_ID,
    endPhaseId: PHASE_END_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makePhase = (id: string, order: number, eventId: string = EVENT_ID) => ({
  id,
  order,
  eventId,
});

const baseCommand: UpdateQimelaCommand = {
  id: QIMELA_ID,
  requesterId: CREATOR_ID,
};

// ─── Test setup ──────────────────────────────────────────────────────────────

describe('UpdateQimelaUseCase', () => {
  let useCase: UpdateQimelaUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockRuleRepository: jest.Mocked<RuleRepository>;
  let mockPrisma: {
    phase: { findUnique: jest.Mock };
    qimelaRule: { deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockRuleRepository = {
      findAll: jest.fn(),
      findByIds: jest.fn(),
    };

    mockPrisma = {
      phase: { findUnique: jest.fn() },
      qimelaRule: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new UpdateQimelaUseCase(mockLogger, 
      mockQimelaRepository,
      mockRuleRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  // ─── Authorization & basic guards ─────────────────────────────────────────

  describe('authorization and guards', () => {
    it('throws NotFoundException when qimela does not exist', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the creator', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, requesterId: OTHER_USER_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnprocessableEntityException when qimela is COMPLETED', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.COMPLETED }),
      );

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── No-op when nothing changes ────────────────────────────────────────────

  describe('no-op update', () => {
    it('returns current qimela data without calling update when no patch fields are provided', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());

      // Act
      const result = await useCase.execute(baseCommand);

      // Assert
      expect(mockQimelaRepository.update).not.toHaveBeenCalled();
      expect(result.data.id).toBe(QIMELA_ID);
      expect(result.data.name).toBe('Original Name');
    });
  });

  // ─── Name update ──────────────────────────────────────────────────────────

  describe('name update', () => {
    it('updates the name when a new name is provided', async () => {
      // Arrange
      const updatedQimela = makeQimela({ name: 'New Qimela Name' });
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());
      mockQimelaRepository.update.mockResolvedValue(updatedQimela);

      // Act
      const result = await useCase.execute({ ...baseCommand, name: 'New Qimela Name' });

      // Assert
      expect(mockQimelaRepository.update).toHaveBeenCalledWith(
        QIMELA_ID,
        expect.objectContaining({ name: 'New Qimela Name' }),
      );
      expect(result.data.name).toBe('New Qimela Name');
    });
  });

  // ─── Phase change — UPCOMING qimela ───────────────────────────────────────

  describe('phase change on UPCOMING qimela', () => {
    beforeEach(() => {
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.UPCOMING }),
      );
    });

    it('updates both initialPhaseId and finalPhaseId when both provided', async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(NEW_INITIAL_PHASE_ID, 1))
        .mockResolvedValueOnce(makePhase(NEW_FINAL_PHASE_ID, 3));
      mockQimelaRepository.update.mockResolvedValue(
        makeQimela({ startPhaseId: NEW_INITIAL_PHASE_ID, endPhaseId: NEW_FINAL_PHASE_ID }),
      );

      // Act
      await useCase.execute({
        ...baseCommand,
        initialPhaseId: NEW_INITIAL_PHASE_ID,
        finalPhaseId: NEW_FINAL_PHASE_ID,
      });

      // Assert
      expect(mockQimelaRepository.update).toHaveBeenCalledWith(
        QIMELA_ID,
        expect.objectContaining({
          startPhaseId: NEW_INITIAL_PHASE_ID,
          endPhaseId: NEW_FINAL_PHASE_ID,
        }),
      );
    });

    it('throws UnprocessableEntityException when initialPhase does not belong to event', async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(NEW_INITIAL_PHASE_ID, 1, 'other-event'))
        .mockResolvedValueOnce(makePhase(NEW_FINAL_PHASE_ID, 3));

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, initialPhaseId: NEW_INITIAL_PHASE_ID, finalPhaseId: NEW_FINAL_PHASE_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when initialPhase order > finalPhase order', async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(NEW_INITIAL_PHASE_ID, 5))
        .mockResolvedValueOnce(makePhase(NEW_FINAL_PHASE_ID, 2));

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, initialPhaseId: NEW_INITIAL_PHASE_ID, finalPhaseId: NEW_FINAL_PHASE_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── Phase change — ACTIVE qimela ─────────────────────────────────────────

  describe('phase change on ACTIVE qimela', () => {
    beforeEach(() => {
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.ACTIVE, startPhaseId: PHASE_START_ID, endPhaseId: PHASE_END_ID }),
      );
    });

    it('throws UnprocessableEntityException when trying to change initialPhaseId on ACTIVE qimela', async () => {
      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, initialPhaseId: NEW_INITIAL_PHASE_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows extending finalPhaseId to a later phase on ACTIVE qimela', async () => {
      // Arrange: current endPhase has order 3, new finalPhase has order 5
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(PHASE_START_ID, 1)) // current startPhase used for validation
        .mockResolvedValueOnce(makePhase(NEW_FINAL_PHASE_ID, 5)) // new finalPhase
        .mockResolvedValueOnce(makePhase(PHASE_END_ID, 3)); // current endPhase order check
      mockQimelaRepository.update.mockResolvedValue(
        makeQimela({ startPhaseId: PHASE_START_ID, endPhaseId: NEW_FINAL_PHASE_ID }),
      );

      // Act
      await useCase.execute({ ...baseCommand, finalPhaseId: NEW_FINAL_PHASE_ID });

      // Assert
      expect(mockQimelaRepository.update).toHaveBeenCalledWith(
        QIMELA_ID,
        expect.objectContaining({ endPhaseId: NEW_FINAL_PHASE_ID }),
      );
    });

    it('throws UnprocessableEntityException when trying to shorten finalPhaseId on ACTIVE qimela', async () => {
      // Arrange: current endPhase has order 5, new finalPhase has order 2
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(PHASE_START_ID, 1))
        .mockResolvedValueOnce(makePhase(NEW_FINAL_PHASE_ID, 2)) // order < current end
        .mockResolvedValueOnce(makePhase(PHASE_END_ID, 5)); // current end order

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, finalPhaseId: NEW_FINAL_PHASE_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
