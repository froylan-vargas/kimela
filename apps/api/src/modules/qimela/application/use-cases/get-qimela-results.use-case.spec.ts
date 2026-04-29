import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { GetQimelaResultsUseCase } from "./get-qimela-results.use-case";
import { QimelaRepository } from "../../domain/qimela.repository";
import { QimelaEntity } from "../../domain/qimela.entity";
import { QimelaStatus } from "../../domain/qimela-status.enum";
import { PrismaService } from "../../../../shared/prisma/prisma.service";

const QIMELA_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const OTHER_USER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const CREATOR_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const EVENT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const PHASE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const SPORT_ID = "sport-id";

const makeQimela = (
  overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {},
): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: "Test qimela",
    status: QimelaStatus.ACTIVE,
    sportId: SPORT_ID,
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

describe("GetQimelaResultsUseCase", () => {
  let useCase: GetQimelaResultsUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockPrisma: {
    phase: { findFirst: jest.Mock };
    subscription: { findFirst: jest.Mock; findMany: jest.Mock };
    sport: { findUnique: jest.Mock };
    pickCategory: { findMany: jest.Mock };
    session: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    userPick: { findMany: jest.Mock };
    userSessionPoints: { findMany: jest.Mock };
  };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      phase: { findFirst: jest.fn() },
      subscription: { findFirst: jest.fn(), findMany: jest.fn() },
      sport: { findUnique: jest.fn() },
      pickCategory: { findMany: jest.fn() },
      session: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      userPick: { findMany: jest.fn() },
      userSessionPoints: { findMany: jest.fn() },
    };

    const mockLogger: any = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    useCase = new GetQimelaResultsUseCase(
      mockLogger,
      mockQimelaRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  it("rejects when compareUserIds exceeds max", async () => {
    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        userId: USER_ID,
        phaseId: PHASE_ID,
        compareUserIds: ["a", "b", "c", "d"],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws NotFoundException when qimela does not exist", async () => {
    mockQimelaRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        userId: USER_ID,
        phaseId: PHASE_ID,
        compareUserIds: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when current user has no access", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        userId: USER_ID,
        phaseId: PHASE_ID,
        compareUserIds: [],
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException when phase does not belong to qimela event", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        userId: USER_ID,
        phaseId: PHASE_ID,
        compareUserIds: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws ForbiddenException when a compare user does not belong to the qimela", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findFirst.mockResolvedValue({ id: PHASE_ID });
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        userId: USER_ID,
        phaseId: PHASE_ID,
        compareUserIds: [OTHER_USER_ID],
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns comparison data with real result, picks and points per user", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findFirst.mockResolvedValue({ id: PHASE_ID });
    mockPrisma.subscription.findMany.mockResolvedValue([
      { userId: OTHER_USER_ID },
    ]);
    mockPrisma.sport.findUnique.mockResolvedValue({ id: SPORT_ID });
    mockPrisma.pickCategory.findMany.mockResolvedValue([
      { id: "cat-home", name: "score_home" },
      { id: "cat-away", name: "score_away" },
    ]);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        name: "Italia vs México",
        scheduledAt: new Date("2026-04-20T20:00:00Z"),
        phase: { id: PHASE_ID, name: "Jornada 1" },
        contenders: [
          {
            role: "home",
            contender: { id: "home-id", name: "Italia", imgUrl: null },
          },
          {
            role: "away",
            contender: { id: "away-id", name: "México", imgUrl: null },
          },
        ],
        results: [
          { pickCategoryId: "cat-home", value: "2" },
          { pickCategoryId: "cat-away", value: "1" },
        ],
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: USER_ID, name: "Froilan" },
      { id: OTHER_USER_ID, name: "Laura" },
    ]);
    mockPrisma.userPick.findMany.mockResolvedValue([
      {
        userId: USER_ID,
        sessionId: "session-1",
        pickCategoryId: "cat-home",
        value: "2",
      },
      {
        userId: USER_ID,
        sessionId: "session-1",
        pickCategoryId: "cat-away",
        value: "1",
      },
      {
        userId: OTHER_USER_ID,
        sessionId: "session-1",
        pickCategoryId: "cat-home",
        value: "1",
      },
    ]);
    mockPrisma.userSessionPoints.findMany.mockResolvedValue([
      { userId: USER_ID, sessionId: "session-1", points: 3 },
      { userId: OTHER_USER_ID, sessionId: "session-1", points: 1 },
    ]);

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      userId: USER_ID,
      phaseId: PHASE_ID,
      compareUserIds: [OTHER_USER_ID],
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: "session-1",
        actualResult: { homeScore: "2", awayScore: "1" },
        users: [
          expect.objectContaining({
            userId: USER_ID,
            userName: "Froilan",
            homePick: "2",
            awayPick: "1",
            points: 3,
          }),
          expect.objectContaining({
            userId: OTHER_USER_ID,
            userName: "Laura",
            homePick: "1",
            awayPick: null,
            points: 1,
          }),
        ],
      }),
    );

    expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          phaseId: PHASE_ID,
        },
      }),
    );
  });

  it("returns sessions without official result and leaves points empty until scoring exists", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findFirst.mockResolvedValue({ id: PHASE_ID });
    mockPrisma.subscription.findMany.mockResolvedValue([
      { userId: OTHER_USER_ID },
    ]);
    mockPrisma.sport.findUnique.mockResolvedValue({ id: SPORT_ID });
    mockPrisma.pickCategory.findMany.mockResolvedValue([
      { id: "cat-home", name: "score_home" },
      { id: "cat-away", name: "score_away" },
    ]);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: "session-2",
        name: "Brasil vs Argentina",
        scheduledAt: new Date("2026-04-21T20:00:00Z"),
        phase: { id: PHASE_ID, name: "Jornada 1" },
        contenders: [
          {
            role: "home",
            contender: { id: "home-id", name: "Brasil", imgUrl: null },
          },
          {
            role: "away",
            contender: { id: "away-id", name: "Argentina", imgUrl: null },
          },
        ],
        results: [],
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: USER_ID, name: "Froilan" },
      { id: OTHER_USER_ID, name: "Laura" },
    ]);
    mockPrisma.userPick.findMany.mockResolvedValue([
      {
        userId: USER_ID,
        sessionId: "session-2",
        pickCategoryId: "cat-home",
        value: "1",
      },
      {
        userId: USER_ID,
        sessionId: "session-2",
        pickCategoryId: "cat-away",
        value: "1",
      },
      {
        userId: OTHER_USER_ID,
        sessionId: "session-2",
        pickCategoryId: "cat-home",
        value: "2",
      },
      {
        userId: OTHER_USER_ID,
        sessionId: "session-2",
        pickCategoryId: "cat-away",
        value: "0",
      },
    ]);
    mockPrisma.userSessionPoints.findMany.mockResolvedValue([]);

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      userId: USER_ID,
      phaseId: PHASE_ID,
      compareUserIds: [OTHER_USER_ID],
    });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: "session-2",
        actualResult: { homeScore: null, awayScore: null },
        users: [
          expect.objectContaining({
            userId: USER_ID,
            homePick: "1",
            awayPick: "1",
            points: null,
          }),
          expect.objectContaining({
            userId: OTHER_USER_ID,
            homePick: "2",
            awayPick: "0",
            points: null,
          }),
        ],
      }),
    );
  });

  it("returns null points for users without picks", async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-id" });
    mockPrisma.phase.findFirst.mockResolvedValue({ id: PHASE_ID });
    mockPrisma.subscription.findMany.mockResolvedValue([
      { userId: OTHER_USER_ID },
    ]);
    mockPrisma.sport.findUnique.mockResolvedValue({ id: SPORT_ID });
    mockPrisma.pickCategory.findMany.mockResolvedValue([
      { id: "cat-home", name: "score_home" },
      { id: "cat-away", name: "score_away" },
    ]);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        name: "Italia vs México",
        scheduledAt: new Date("2026-04-20T20:00:00Z"),
        phase: { id: PHASE_ID, name: "Jornada 1" },
        contenders: [
          {
            role: "home",
            contender: { id: "home-id", name: "Italia", imgUrl: null },
          },
          {
            role: "away",
            contender: { id: "away-id", name: "México", imgUrl: null },
          },
        ],
        results: [{ pickCategoryId: "cat-home", value: "2" }],
      },
    ]);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: USER_ID, name: "Froilan" },
      { id: OTHER_USER_ID, name: "Laura" },
    ]);
    mockPrisma.userPick.findMany.mockResolvedValue([]);
    mockPrisma.userSessionPoints.findMany.mockResolvedValue([]);

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      userId: USER_ID,
      phaseId: PHASE_ID,
      compareUserIds: [OTHER_USER_ID],
    });

    expect(result.data[0].users).toEqual([
      expect.objectContaining({
        userId: USER_ID,
        homePick: null,
        awayPick: null,
        points: null,
      }),
      expect.objectContaining({
        userId: OTHER_USER_ID,
        homePick: null,
        awayPick: null,
        points: null,
      }),
    ]);
  });
});
