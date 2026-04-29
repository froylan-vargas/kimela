import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { GetQimelaPhasesUseCase } from "./get-qimela-phases.use-case";
import { QimelaRepository } from "../../domain/qimela.repository";
import { QimelaEntity } from "../../domain/qimela.entity";
import { QimelaStatus } from "../../domain/qimela-status.enum";
import { PrismaService } from "../../../../shared/prisma/prisma.service";

const QIMELA_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CREATOR_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const EVENT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

const makeQimela = (
  overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {},
): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: "Test qimela",
    status: QimelaStatus.ACTIVE,
    sportId: "sport-id",
    creatorId: CREATOR_ID,
    eventId: EVENT_ID,
    leagueId: null,
    startPhaseId: null,
    endPhaseId: null,
    rules: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });

describe("GetQimelaPhasesUseCase", () => {
  let useCase: GetQimelaPhasesUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockPrisma: {
    phase: { findMany: jest.Mock };
    subscription: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      phase: { findMany: jest.fn() },
      subscription: { findFirst: jest.fn() },
    };

    const mockLogger: any = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new GetQimelaPhasesUseCase(
      mockLogger,
      mockQimelaRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  it("throws NotFoundException when qimela does not exist", async () => {
    mockQimelaRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, userId: USER_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws UnprocessableEntityException when qimela has no event", async () => {
    mockQimelaRepository.findById.mockResolvedValue(
      makeQimela({ eventId: null }),
    );

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, userId: CREATOR_ID }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("throws ForbiddenException when user is not creator nor subscribed", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, userId: USER_ID }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns only COMPLETED and ACTIVE phases ordered by order", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findMany.mockResolvedValue([
      { id: "phase-1", name: "Jornada 1", order: 1, status: "COMPLETED" },
      { id: "phase-2", name: "Jornada 2", order: 2, status: "ACTIVE" },
    ]);

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      userId: USER_ID,
    });

    expect(result.data).toEqual([
      { id: "phase-1", name: "Jornada 1", order: 1, status: "COMPLETED" },
      { id: "phase-2", name: "Jornada 2", order: 2, status: "ACTIVE" },
    ]);

    expect(mockPrisma.phase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: EVENT_ID,
          status: { in: ["COMPLETED", "ACTIVE"] },
        }),
        orderBy: { order: "asc" },
      }),
    );
  });
});
