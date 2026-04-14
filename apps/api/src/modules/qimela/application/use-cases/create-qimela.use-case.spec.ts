import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CreateQimelaUseCase, CreateQimelaCommand } from './create-qimela.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { RuleRepository } from '../../domain/rule.repository';
import { RuleEntity } from '../../domain/rule.entity';
import { CoveredStages } from '../../domain/covered-stages.enum';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RULE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SPORT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const LEAGUE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const CREATOR_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const baseCommand: CreateQimelaCommand = {
  creatorId: CREATOR_ID,
  name: 'Test Qimela Pool',
  sportId: SPORT_ID,
  eventId: EVENT_ID,
  leagueId: LEAGUE_ID,
  coveredStages: CoveredStages.REGULAR_SEASON,
  rules: [{ ruleId: RULE_ID, points: 3 }],
};

const makeRule = (overrides: Partial<RuleEntity> = {}): RuleEntity =>
  ({
    id: RULE_ID,
    slug: 'winner',
    minPoints: 0,
    maxPoints: 5,
    ...overrides,
  }) as unknown as RuleEntity;

const makeSavedEntity = (): QimelaEntity =>
  new QimelaEntity({
    id: 'new-qimela-id',
    name: baseCommand.name,
    status: QimelaStatus.ACTIVE,
    sportId: SPORT_ID,
    eventId: EVENT_ID,
    leagueId: LEAGUE_ID,
    creatorId: CREATOR_ID,
    coveredStages: CoveredStages.REGULAR_SEASON,
    startPhaseId: 'phase-rs-1',
    endPhaseId: 'phase-rs-2',
    rules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makePhase = (
  id: string,
  order: number,
  type: 'REGULAR_SEASON' | 'PLAYOFFS' | 'OTHER',
  sessions: { status: string }[] = [],
) => ({ id, order, type, sessions });

const makeEvent = (
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  phases: ReturnType<typeof makePhase>[],
) => ({
  id: EVENT_ID,
  status,
  phases,
  leagueId: LEAGUE_ID,
});

// ─── Test setup ──────────────────────────────────────────────────────────────

describe('CreateQimelaUseCase', () => {
  let useCase: CreateQimelaUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockRuleRepository: jest.Mocked<RuleRepository>;
  let mockPrisma: { event: { findUnique: jest.Mock } };

  beforeEach(() => {
    mockQimelaRepository = { findById: jest.fn(), findForUser: jest.fn(), save: jest.fn(), update: jest.fn() };
    mockRuleRepository = { findAll: jest.fn(), findByIds: jest.fn() };
    mockPrisma = { event: { findUnique: jest.fn() } };

    useCase = new CreateQimelaUseCase(
      mockQimelaRepository,
      mockRuleRepository,
      mockPrisma as any,
    );
  });

  // ─── Rule validation ───────────────────────────────────────────────────────

  describe('rule validation', () => {
    it('throws NotFoundException when a submitted rule id does not exist', async () => {
      // Arrange
      mockRuleRepository.findByIds.mockResolvedValue([]);
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', []));

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when points are below rule minimum', async () => {
      // Arrange
      mockRuleRepository.findByIds.mockResolvedValue([makeRule({ minPoints: 4 } as any)]);
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', []));

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, rules: [{ ruleId: RULE_ID, points: 1 }] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when points exceed rule maximum', async () => {
      // Arrange
      mockRuleRepository.findByIds.mockResolvedValue([makeRule({ maxPoints: 2 } as any)]);
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', []));

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, rules: [{ ruleId: RULE_ID, points: 3 }] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── Phase resolution — UPCOMING event ────────────────────────────────────

  describe('phase resolution for UPCOMING event', () => {
    beforeEach(() => {
      mockRuleRepository.findByIds.mockResolvedValue([makeRule()]);
      mockQimelaRepository.save.mockResolvedValue(makeSavedEntity());
    });

    it('UPCOMING + REGULAR_SEASON: sets start to first and end to last REGULAR_SEASON phase', async () => {
      // Arrange
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON'),
        makePhase('rs-2', 2, 'REGULAR_SEASON'),
        makePhase('po-1', 3, 'PLAYOFFS'),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', phases));

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.REGULAR_SEASON });

      // Assert
      const savedEntity: QimelaEntity = mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.startPhaseId).toBe('rs-1');
      expect(savedEntity.endPhaseId).toBe('rs-2');
    });

    it('UPCOMING + PLAYOFFS: sets start to first and end to last PLAYOFFS phase', async () => {
      // Arrange
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON'),
        makePhase('po-1', 2, 'PLAYOFFS'),
        makePhase('po-2', 3, 'PLAYOFFS'),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', phases));

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.PLAYOFFS });

      // Assert
      const savedEntity: QimelaEntity = mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.startPhaseId).toBe('po-1');
      expect(savedEntity.endPhaseId).toBe('po-2');
    });

    it('UPCOMING + FULL: sets start to first and end to last among RS ∪ PO phases', async () => {
      // Arrange
      const phases = [
        makePhase('other-1', 0, 'OTHER'),
        makePhase('rs-1', 1, 'REGULAR_SEASON'),
        makePhase('po-1', 2, 'PLAYOFFS'),
        makePhase('other-2', 3, 'OTHER'),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('UPCOMING', phases));

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.FULL });

      // Assert
      const savedEntity: QimelaEntity = mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.startPhaseId).toBe('rs-1');
      expect(savedEntity.endPhaseId).toBe('po-1');
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

  // ─── Phase resolution — ACTIVE event ──────────────────────────────────────

  describe('phase resolution for ACTIVE event', () => {
    beforeEach(() => {
      mockRuleRepository.findByIds.mockResolvedValue([makeRule()]);
      mockQimelaRepository.save.mockResolvedValue(makeSavedEntity());
    });

    it('ACTIVE + REGULAR_SEASON: start = first RS phase after currentPhase, end = last RS phase', async () => {
      // Arrange: currentPhase is rs-1 (has SCHEDULED session), rs-2 is next
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON', [{ status: 'SCHEDULED' }]),
        makePhase('rs-2', 2, 'REGULAR_SEASON', [{ status: 'SCHEDULED' }]),
        makePhase('po-1', 3, 'PLAYOFFS'),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('ACTIVE', phases));

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.REGULAR_SEASON });

      // Assert: start = rs-2 (order > currentPhase.order=1), end = rs-2
      const savedEntity: QimelaEntity = mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.startPhaseId).toBe('rs-2');
      expect(savedEntity.endPhaseId).toBe('rs-2');
    });

    it('ACTIVE + REGULAR_SEASON: throws when all RS phases are at or before currentPhase', async () => {
      // Arrange: rs-1 is current, rs-2 is completed (no future RS phases)
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON', [{ status: 'SCHEDULED' }]),
        makePhase('po-1', 2, 'PLAYOFFS'),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('ACTIVE', phases));

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, coveredStages: CoveredStages.REGULAR_SEASON }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('ACTIVE + PLAYOFFS: start = current PLAYOFFS phase when it has SCHEDULED sessions', async () => {
      // Arrange: po-1 is the current phase (has SCHEDULED session)
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON', [{ status: 'COMPLETED' }]),
        makePhase('po-1', 2, 'PLAYOFFS', [{ status: 'SCHEDULED' }]),
        makePhase('po-2', 3, 'PLAYOFFS', [{ status: 'SCHEDULED' }]),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('ACTIVE', phases));

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.PLAYOFFS });

      // Assert
      const savedEntity: QimelaEntity = mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.startPhaseId).toBe('po-1');
      expect(savedEntity.endPhaseId).toBe('po-2');
    });

    it('ACTIVE + FULL: start = first eligible phase after currentPhase', async () => {
      // Arrange: rs-1 is current, rs-2 and po-1 are future
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON', [{ status: 'SCHEDULED' }]),
        makePhase('rs-2', 2, 'REGULAR_SEASON'),
        makePhase('po-1', 3, 'PLAYOFFS'),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('ACTIVE', phases));

      // Act
      await useCase.execute({ ...baseCommand, coveredStages: CoveredStages.FULL });

      // Assert
      const savedEntity: QimelaEntity = mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.startPhaseId).toBe('rs-2');
      expect(savedEntity.endPhaseId).toBe('po-1');
    });

    it('throws NotFoundException when event does not exist', async () => {
      // Arrange
      mockPrisma.event.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when all phases are completed', async () => {
      // Arrange: no phase has SCHEDULED sessions
      const phases = [
        makePhase('rs-1', 1, 'REGULAR_SEASON', [{ status: 'COMPLETED' }]),
      ];
      mockPrisma.event.findUnique.mockResolvedValue(makeEvent('ACTIVE', phases));

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, coveredStages: CoveredStages.REGULAR_SEASON }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
