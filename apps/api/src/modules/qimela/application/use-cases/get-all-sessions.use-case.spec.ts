import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { GetAllSessionsUseCase } from "./get-all-sessions.use-case";
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

describe("GetAllSessionsUseCase", () => {
  let useCase: GetAllSessionsUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockPrisma: {
    phase: { findMany: jest.Mock };
    session: { findMany: jest.Mock };
    subscription: { findFirst: jest.Mock };
    userPick: { findMany: jest.Mock };
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
      session: { findMany: jest.fn() },
      subscription: { findFirst: jest.fn() },
      userPick: { findMany: jest.fn() },
    };

    const mockLogger: any = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new GetAllSessionsUseCase(
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

  it("throws ForbiddenException when user has no access", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, userId: USER_ID }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws UnprocessableEntityException when qimela has no event", async () => {
    mockQimelaRepository.findById.mockResolvedValue(
      makeQimela({ eventId: null }),
    );

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, userId: CREATOR_ID }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("groups future sessions by phase and drops phases with no sessions", async () => {
    jest
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-04-21T23:30:00Z").getTime());

    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findMany.mockResolvedValue([
      { id: "phase-1", name: "Jornada 1", order: 1 },
      { id: "phase-2", name: "Jornada 2", order: 2 },
    ]);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        name: "Atlas vs América",
        scheduledAt: new Date("2026-05-01T20:00:00Z"),
        status: "SCHEDULED",
        phase: { id: "phase-1", name: "Jornada 1", order: 1 },
        contenders: [
          {
            role: "home",
            contender: { id: "home-id", name: "Atlas", imgUrl: null },
          },
          {
            role: "away",
            contender: { id: "away-id", name: "América", imgUrl: null },
          },
        ],
        sessionCategories: [],
      },
    ]);
    mockPrisma.userPick.findMany.mockResolvedValue([]);

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      userId: USER_ID,
    });

    expect(result.data).toEqual([
      expect.objectContaining({
        phaseId: "phase-1",
        sessions: [
          expect.objectContaining({
            id: "session-1",
            scheduledAt: "2026-05-01T20:00:00.000",
            hasUserPicks: false,
          }),
        ],
      }),
    ]);
    expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });

  it("fetches picks filtered by qimelaId so picks from other qimelas are not shown", async () => {
    jest
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-04-21T23:30:00Z").getTime());

    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findMany.mockResolvedValue([
      { id: "phase-1", name: "Jornada 1", order: 1 },
    ]);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        name: "Atlas vs América",
        scheduledAt: new Date("2026-05-01T20:00:00Z"),
        status: "SCHEDULED",
        phase: { id: "phase-1", name: "Jornada 1", order: 1 },
        contenders: [],
        sessionCategories: [],
      },
    ]);
    mockPrisma.userPick.findMany.mockResolvedValue([]);

    await useCase.execute({ qimelaId: QIMELA_ID, userId: USER_ID });

    expect(mockPrisma.userPick.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ qimelaId: QIMELA_ID }),
      }),
    );
  });

  it("marks sessions with saved picks via hasUserPicks", async () => {
    jest
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-04-21T23:30:00Z").getTime());

    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findMany.mockResolvedValue([
      { id: "phase-1", name: "Jornada 1", order: 1 },
    ]);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: "session-with-picks",
        name: "Atlas vs América",
        scheduledAt: new Date("2026-05-01T20:00:00Z"),
        status: "SCHEDULED",
        phase: { id: "phase-1", name: "Jornada 1", order: 1 },
        contenders: [],
        sessionCategories: [
          {
            pickCategory: {
              id: "pick-category-1",
              name: "score_home",
              label: "Goles local",
              valueType: "SCALAR",
            },
          },
        ],
      },
    ]);
    mockPrisma.userPick.findMany.mockResolvedValue([
      {
        sessionId: "session-with-picks",
        value: "2",
        pickedContenderId: null,
        pickCategory: {
          id: "pick-category-1",
          name: "score_home",
          label: "Goles local",
          valueType: "SCALAR",
        },
      },
    ]);

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      userId: USER_ID,
    });

    expect(result.data[0].sessions[0].hasUserPicks).toBe(true);
  });
});
