import { BadRequestException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { SaveSessionPicksUseCase } from './save-session-picks.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { SessionPickRepository } from '../../domain/session-pick.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SESSION_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CREATOR_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const PICK_CATEGORY_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

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

describe('SaveSessionPicksUseCase', () => {
  let useCase: SaveSessionPicksUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockSessionPickRepository: jest.Mocked<SessionPickRepository>;
  let mockPrisma: {
    subscription: { findFirst: jest.Mock };
    session: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockSessionPickRepository = {
      savePicksForSession: jest.fn(),
      findPicksForUserAndSession: jest.fn(),
    };

    mockPrisma = {
      subscription: { findFirst: jest.fn() },
      session: { findUnique: jest.fn() },
    };

    useCase = new SaveSessionPicksUseCase(
      mockQimelaRepository,
      mockSessionPickRepository,
      mockPrisma as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws NotFoundException when qimela does not exist', async () => {
    mockQimelaRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, sessionId: SESSION_ID, userId: USER_ID, picks: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when user has no access', async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, sessionId: SESSION_ID, userId: USER_ID, picks: [] }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when session does not exist', async () => {
    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.session.findUnique.mockResolvedValue(null);

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, sessionId: SESSION_ID, userId: USER_ID, picks: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws UnprocessableEntityException when deadline passed', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T23:30:00.000Z').getTime());

    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: SESSION_ID,
      scheduledAt: new Date('2026-04-21T17:32:00.000Z'),
      status: 'SCHEDULED',
      phase: { eventId: EVENT_ID },
      sessionCategories: [],
    });

    await expect(
      useCase.execute({ qimelaId: QIMELA_ID, sessionId: SESSION_ID, userId: USER_ID, picks: [] }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws BadRequestException when scalar pick is out of range', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T23:30:00.000Z').getTime());

    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: SESSION_ID,
      scheduledAt: new Date('2026-04-21T17:40:00.000Z'),
      status: 'SCHEDULED',
      phase: { eventId: EVENT_ID },
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
    });

    await expect(
      useCase.execute({
        qimelaId: QIMELA_ID,
        sessionId: SESSION_ID,
        userId: USER_ID,
        picks: [{ pickCategoryId: PICK_CATEGORY_ID, value: '100', pickedContenderId: null }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('saves picks and returns repository response', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T23:30:00.000Z').getTime());

    mockQimelaRepository.findById.mockResolvedValue(makeQimela());
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-id' });
    mockPrisma.session.findUnique.mockResolvedValue({
      id: SESSION_ID,
      scheduledAt: new Date('2026-04-21T17:40:00.000Z'),
      status: 'SCHEDULED',
      phase: { eventId: EVENT_ID },
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
    });
    mockSessionPickRepository.savePicksForSession.mockResolvedValue([
      {
        pickCategoryId: PICK_CATEGORY_ID,
        name: 'score_home',
        label: 'Goles local',
        valueType: 'SCALAR',
        value: '2',
        pickedContenderId: null,
      },
    ]);

    const result = await useCase.execute({
      qimelaId: QIMELA_ID,
      sessionId: SESSION_ID,
      userId: USER_ID,
      picks: [{ pickCategoryId: PICK_CATEGORY_ID, value: '2', pickedContenderId: null }],
    });

    expect(mockSessionPickRepository.savePicksForSession).toHaveBeenCalledWith({
      userId: USER_ID,
      sessionId: SESSION_ID,
      picks: [{ pickCategoryId: PICK_CATEGORY_ID, value: '2', pickedContenderId: null }],
    });
    expect(result).toEqual({
      data: {
        sessionId: SESSION_ID,
        picks: [
          expect.objectContaining({
            pickCategoryId: PICK_CATEGORY_ID,
            value: '2',
          }),
        ],
      },
    });
  });
});
