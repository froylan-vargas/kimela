import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  CreateQimelaUseCase,
  CreateQimelaCommand,
} from "./create-qimela.use-case";
import { QimelaRepository } from "../../domain/qimela.repository";
import { RuleRepository } from "../../domain/rule.repository";
import { RuleEntity } from "../../domain/rule.entity";
import { QimelaEntity } from "../../domain/qimela.entity";
import { QimelaStatus } from "../../domain/qimela-status.enum";
import { PrismaService } from "../../../../shared/prisma/prisma.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RULE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SPORT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const LEAGUE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const EVENT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const CREATOR_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const INITIAL_PHASE_ID = "phase-initial-id";
const FINAL_PHASE_ID = "phase-final-id";

const baseCommand: CreateQimelaCommand = {
  creatorId: CREATOR_ID,
  name: "Test qimela Pool",
  sportId: SPORT_ID,
  eventId: EVENT_ID,
  leagueId: LEAGUE_ID,
  initialPhaseId: INITIAL_PHASE_ID,
  finalPhaseId: FINAL_PHASE_ID,
  rules: [{ ruleId: RULE_ID, points: 3 }],
};

const makeRule = (overrides: Partial<RuleEntity> = {}): RuleEntity =>
  ({
    id: RULE_ID,
    slug: "winner",
    minPoints: 0,
    maxPoints: 5,
    ...overrides,
  }) as unknown as RuleEntity;

const makeSavedEntity = (status = QimelaStatus.UPCOMING): QimelaEntity =>
  new QimelaEntity({
    id: "new-qimela-id",
    name: baseCommand.name,
    status,
    sportId: SPORT_ID,
    eventId: EVENT_ID,
    leagueId: LEAGUE_ID,
    creatorId: CREATOR_ID,
    startPhaseId: INITIAL_PHASE_ID,
    endPhaseId: FINAL_PHASE_ID,
    rules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makePhase = (
  id: string,
  order: number,
  eventId: string,
  status: string = "UPCOMING",
) => ({ id, order, eventId, status });

// ─── Test setup ──────────────────────────────────────────────────────────────

describe("CreateQimelaUseCase", () => {
  let useCase: CreateQimelaUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockRuleRepository: jest.Mocked<RuleRepository>;
  let mockPrisma: { phase: { findUnique: jest.Mock } };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    mockRuleRepository = { findAll: jest.fn(), findByIds: jest.fn() };
    mockPrisma = { phase: { findUnique: jest.fn() } };

    const mockLogger: any = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new CreateQimelaUseCase(
      mockLogger,
      mockQimelaRepository,
      mockRuleRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  // ─── Rule validation ───────────────────────────────────────────────────────

  describe("rule validation", () => {
    beforeEach(() => {
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 1, EVENT_ID))
        .mockResolvedValueOnce(makePhase(FINAL_PHASE_ID, 2, EVENT_ID));
    });

    it("throws NotFoundException when a submitted rule id does not exist", async () => {
      // Arrange
      mockRuleRepository.findByIds.mockResolvedValue([]);

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws UnprocessableEntityException when points are below rule minimum", async () => {
      // Arrange
      mockRuleRepository.findByIds.mockResolvedValue([
        makeRule({ minPoints: 4 }),
      ]);

      // Act + Assert
      await expect(
        useCase.execute({
          ...baseCommand,
          rules: [{ ruleId: RULE_ID, points: 1 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("throws UnprocessableEntityException when points exceed rule maximum", async () => {
      // Arrange
      mockRuleRepository.findByIds.mockResolvedValue([
        makeRule({ maxPoints: 2 }),
      ]);

      // Act + Assert
      await expect(
        useCase.execute({
          ...baseCommand,
          rules: [{ ruleId: RULE_ID, points: 3 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── Phase validation ──────────────────────────────────────────────────────

  describe("phase validation", () => {
    beforeEach(() => {
      mockRuleRepository.findByIds.mockResolvedValue([makeRule()]);
    });

    it("throws UnprocessableEntityException when initialPhase does not belong to the event", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 1, "other-event-id"))
        .mockResolvedValueOnce(makePhase(FINAL_PHASE_ID, 2, EVENT_ID));

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("throws UnprocessableEntityException when finalPhase does not belong to the event", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 1, EVENT_ID))
        .mockResolvedValueOnce(makePhase(FINAL_PHASE_ID, 2, "other-event-id"));

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("throws UnprocessableEntityException when initialPhase is ACTIVE", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(
          makePhase(INITIAL_PHASE_ID, 1, EVENT_ID, "ACTIVE"),
        )
        .mockResolvedValueOnce(
          makePhase(FINAL_PHASE_ID, 2, EVENT_ID, "UPCOMING"),
        );

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("throws UnprocessableEntityException when finalPhase is ACTIVE", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(
          makePhase(INITIAL_PHASE_ID, 1, EVENT_ID, "UPCOMING"),
        )
        .mockResolvedValueOnce(
          makePhase(FINAL_PHASE_ID, 2, EVENT_ID, "ACTIVE"),
        );

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("throws UnprocessableEntityException when initialPhase order > finalPhase order", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 5, EVENT_ID))
        .mockResolvedValueOnce(makePhase(FINAL_PHASE_ID, 2, EVENT_ID));

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("throws UnprocessableEntityException when initialPhase is not found", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makePhase(FINAL_PHASE_ID, 2, EVENT_ID));

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("throws UnprocessableEntityException when finalPhase is not found", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 1, EVENT_ID))
        .mockResolvedValueOnce(null);

      // Act + Assert
      await expect(useCase.execute(baseCommand)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ─── Successful creation ───────────────────────────────────────────────────

  describe("successful creation", () => {
    beforeEach(() => {
      mockRuleRepository.findByIds.mockResolvedValue([makeRule()]);
    });

    it("creates a qimela with UPCOMING status when initialPhase is not ACTIVE", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(
          makePhase(INITIAL_PHASE_ID, 1, EVENT_ID, "UPCOMING"),
        )
        .mockResolvedValueOnce(
          makePhase(FINAL_PHASE_ID, 2, EVENT_ID, "UPCOMING"),
        );
      mockQimelaRepository.save.mockResolvedValue(
        makeSavedEntity(QimelaStatus.UPCOMING),
      );

      // Act
      const result = await useCase.execute(baseCommand);

      // Assert
      const savedEntity: QimelaEntity =
        mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.status).toBe(QimelaStatus.UPCOMING);
      expect(savedEntity.startPhaseId).toBe(INITIAL_PHASE_ID);
      expect(savedEntity.endPhaseId).toBe(FINAL_PHASE_ID);
      expect(result.data.startPhaseId).toBe(INITIAL_PHASE_ID);
      expect(result.data.endPhaseId).toBe(FINAL_PHASE_ID);
    });

    it("allows same phase as initial and final (single phase qimela)", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 3, EVENT_ID))
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 3, EVENT_ID));
      mockQimelaRepository.save.mockResolvedValue(makeSavedEntity());

      // Act + Assert
      await expect(
        useCase.execute({ ...baseCommand, finalPhaseId: INITIAL_PHASE_ID }),
      ).resolves.not.toThrow();
    });

    it("sets startPhaseId and endPhaseId from command", async () => {
      // Arrange
      mockPrisma.phase.findUnique
        .mockResolvedValueOnce(makePhase(INITIAL_PHASE_ID, 1, EVENT_ID))
        .mockResolvedValueOnce(makePhase(FINAL_PHASE_ID, 4, EVENT_ID));
      mockQimelaRepository.save.mockResolvedValue(makeSavedEntity());

      // Act
      await useCase.execute(baseCommand);

      // Assert
      const savedEntity: QimelaEntity =
        mockQimelaRepository.save.mock.calls[0][0];
      expect(savedEntity.startPhaseId).toBe(INITIAL_PHASE_ID);
      expect(savedEntity.endPhaseId).toBe(FINAL_PHASE_ID);
    });
  });
});
