import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UpdateQimelaUseCase, UpdateQimelaCommand } from './update-qimela.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { CoveredStages } from '../../domain/covered-stages.enum';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SPORT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const LEAGUE_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

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
    coveredStages: CoveredStages.REGULAR_SEASON,
    startPhaseId: 'phase-rs-1',
    endPhaseId: 'phase-rs-2',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makePhase = (
  id: string,
  order: number,
  type: 'REGULAR_SEASON' | 'PLAYOFFS',
  sessions: { status: string }[] = [],
) => ({ id, order, type, sessions });

const makeEvent = (
  status: 'UPCOMING' | 'ACTIVE',
  phases: ReturnType<typeof makePhase>[],
) => ({ id: EVENT_ID, status, phases });

const baseCommand: UpdateQimelaCommand = {
  id: QIMELA_ID,
  requesterId: CREATOR_ID,
};

// ─── Test setup ──────────────────────────────────────────────────────────────

describe('UpdateQimelaUseCase', () => {
  let useCase: UpdateQimelaUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockPrisma: {
    event: { findUnique: jest.Mock };
    phase: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      event: { findUnique: jest.fn() },
      phase: { findFirst: jest.fn() },
    };

    useCase = new UpdateQimelaUseCase(mockQimelaRepository, mockPrisma as any);
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

    it('returns current qimela data when coveredStages is the same as existing', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ coveredStages: CoveredStages.REGULAR_SEASON }),
      );

      // Act
      const result = await useCase.execute({
        ...baseCommand,
        coveredStages: CoveredStages.REGULAR_SEASON,
      });

      // Assert
      expect(mockQimelaRepository.update).not.toHaveBeenCalled();
      expect(result.data.coveredStages).toBe(CoveredStages.REGULAR_SEASON);
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

  // ─── coveredStages change — UPCOMING qimela ───────────────────────────────

  describe('coveredStages change on UPCOMING qimela', () => {
    beforeEach(() => {
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.UPCOMING, coveredStages: CoveredStages.REGULAR_SEASON }),
      );
    });

    it('resolves phases from the event and updates coveredStages', async () => {
      // Arrange
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON'),
        makePhase('po-1', 2, 'PLAYOFFS'),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', phases));
      mockQimelaRepository.update.mockResolvedValue(
        makeQimela({
          coveredStages: CoveredStages.FULL,
          startPhaseId: 'rs-1',
          endPhaseId: 'po-1',
        }),
      );

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.FULL });

      // Assert
      expect(mockQimelaRepository.update).toHaveBeenCalledWith(
        QIMELA_ID,
        expect.objectContaining({
          coveredStages: CoveredStages.FULL,
          startPhaseId: 'rs-1',
          endPhaseId: 'po-1',
        }),
      );
    });

    it('throws NotFoundException when event does not exist during phase resolution', async () => {
      // Arrange
      mockPrisma.event.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, coveredStages: CoveredStages.PLAYOFFS }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when no phases of the requested type exist', async () => {
      // Arrange
      const phases = [makePhase('rs-1', 1, 'REGULAR_SEASON')];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', phases));

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, coveredStages: CoveredStages.PLAYOFFS }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── coveredStages change — ACTIVE qimela ─────────────────────────────────

  describe('coveredStages change on ACTIVE qimela', () => {
    it('allows upgrading from REGULAR_SEASON to FULL and sets endPhaseId to last playoff phase', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.ACTIVE, coveredStages: CoveredStages.REGULAR_SEASON }),
      );
      const lastPlayoffPhase = { id: 'po-final', type: 'PLAYOFFS', order: 5 };
      mockPrisma.phase.findFirst.mockResolvedValue(lastPlayoffPhase);
      mockQimelaRepository.update.mockResolvedValue(
        makeQimela({ coveredStages: CoveredStages.FULL, endPhaseId: 'po-final' }),
      );

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.FULL });

      // Assert
      expect(mockQimelaRepository.update).toHaveBeenCalledWith(
        QIMELA_ID,
        expect.objectContaining({
          coveredStages: CoveredStages.FULL,
          endPhaseId: 'po-final',
        }),
      );
    });

    it('throws UnprocessableEntityException when no playoff phases exist for REGULAR_SEASON to FULL upgrade', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.ACTIVE, coveredStages: CoveredStages.REGULAR_SEASON }),
      );
      mockPrisma.phase.findFirst.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, coveredStages: CoveredStages.FULL }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException for non REGULAR_SEASON to FULL upgrade on ACTIVE qimela', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.ACTIVE, coveredStages: CoveredStages.PLAYOFFS }),
      );

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, coveredStages: CoveredStages.FULL }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when trying to change from FULL on an ACTIVE qimela', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(
        makeQimela({ status: QimelaStatus.ACTIVE, coveredStages: CoveredStages.FULL }),
      );

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, coveredStages: CoveredStages.REGULAR_SEASON }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
