import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { GetUpcomingSessionsUseCase } from './get-upcoming-sessions.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CREATOR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EVENT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const PHASE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const SESSION_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const PICK_CATEGORY_ID = '11111111-1111-1111-1111-111111111111';

const makeQimela = (
  overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {},
): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: 'Test Qimela',
    status: QimelaStatus.ACTIVE,
    sportId: 'sport-id',
    creatorId: CREATOR_ID,
    eventId: EVENT_ID,
    leagueId: null,
    startPhaseId: null,
    endPhaseId: null,
    rules: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

describe('GetUpcomingSessionsUseCase', () => {
  let useCase: GetUpcomingSessionsUseCase;
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

    useCase = new GetUpcomingSessionsUseCase(mockQimelaRepository, mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws NotFoundException when qimela does not exist', async () => {
    mockQimelaRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ qimelaId: QIMELA_ID, userId: USER_ID })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when user has no access', async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    await expect(useCase.execute({ qimelaId: QIMELA_ID, userId: USER_ID })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws UnprocessableEntityException when qimela has no event', async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela({ eventId: null }));

    await expect(useCase.execute({ qimelaId: QIMELA_ID, userId: CREATOR_ID })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('returns upcoming sessions for the next 3 calendar days grouped by phase with pick data', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T23:30:00Z').getTime());

    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.phase.findMany.mockResolvedValue([{ id: PHASE_ID, name: 'Jornada 1', order: 1 }]);
    mockPrisma.session.findMany.mockResolvedValue([
      {
        id: SESSION_ID,
        name: 'Atlas vs América',
        scheduledAt: new Date('2026-04-21T20:00:00Z'),
        status: 'SCHEDULED',
        phase: { id: PHASE_ID, name: 'Jornada 1', order: 1 },
        contenders: [
          { role: 'home', contender: { id: 'home-id', name: 'Atlas', imgUrl: null } },
          { role: 'away', contender: { id: 'away-id', name: 'América', imgUrl: null } },
        ],
        sessionCategories: [
          {
            pickCategory: {
              id: PICK_CATEGORY_ID,
              name: 'score_home',
              label: 'Goles local',
              valueType: 'SCALAR',
            },
          },
        ],
      },
    ]);
    mockPrisma.userPick.findMany.mockResolvedValue([
      {
        sessionId: SESSION_ID,
        value: '2',
        pickedContenderId: null,
        pickCategory: {
          id: PICK_CATEGORY_ID,
          name: 'score_home',
          label: 'Goles local',
          valueType: 'SCALAR',
        },
      },
    ]);

    const result = await useCase.execute({ qimelaId: QIMELA_ID, userId: USER_ID });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        phaseId: PHASE_ID,
        phaseName: 'Jornada 1',
        phaseOrder: 1,
        sessions: [
          expect.objectContaining({
            id: SESSION_ID,
            phaseName: 'Jornada 1',
            scheduledAt: '2026-04-21T20:00:00.000',
            home: expect.objectContaining({ name: 'Atlas' }),
            away: expect.objectContaining({ name: 'América' }),
            picks: [
              expect.objectContaining({
                pickCategoryId: PICK_CATEGORY_ID,
                value: '2',
              }),
            ],
          }),
        ],
      }),
    );
    expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'SCHEDULED',
        }),
      }),
    );
  });
});
