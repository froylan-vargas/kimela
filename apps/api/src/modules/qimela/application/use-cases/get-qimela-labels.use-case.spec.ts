import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { GetQimelaLabelsUseCase } from "./get-qimela-labels.use-case";
import { QimelaRepository } from "../../domain/qimela.repository";
import { QimelaEntity } from "../../domain/qimela.entity";
import { QimelaStatus } from "../../domain/qimela-status.enum";
import { PrismaService } from "../../../../shared/prisma/prisma.service";

const QIMELA_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CREATOR_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OTHER_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SPORT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const LABEL_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

const makeQimela = (
  overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {},
): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: "Test qimela",
    status: QimelaStatus.UPCOMING,
    sportId: SPORT_ID,
    eventId: null,
    leagueId: null,
    creatorId: CREATOR_ID,
    rules: [],
    startPhaseId: null,
    endPhaseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe("GetQimelaLabelsUseCase", () => {
  let useCase: GetQimelaLabelsUseCase;
  let mockQimelaRepo: jest.Mocked<QimelaRepository>;
  let mockPrisma: { qimelaLabel: { findMany: jest.Mock } };

  beforeEach(() => {
    mockQimelaRepo = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      qimelaLabel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const mockLogger: any = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new GetQimelaLabelsUseCase(
      mockLogger,
      mockQimelaRepo,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe("execute", () => {
    it("throws NotFoundException when qimela does not exist", async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException when requester is not the creator", async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: OTHER_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("returns an empty labels array when there are no labels", async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.qimelaLabel.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
      });

      // Assert
      expect(result.data.labels).toHaveLength(0);
    });

    it("returns mapped labels from prisma rows", async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.qimelaLabel.findMany.mockResolvedValue([
        { id: LABEL_ID, name: "Champions", color: "#FF0000" },
        {
          id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
          name: "Rookies",
          color: "#00FF00",
        },
      ]);

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
      });

      // Assert
      expect(result.data.labels).toEqual([
        { id: LABEL_ID, name: "Champions", color: "#FF0000" },
        {
          id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
          name: "Rookies",
          color: "#00FF00",
        },
      ]);
    });
  });
});
