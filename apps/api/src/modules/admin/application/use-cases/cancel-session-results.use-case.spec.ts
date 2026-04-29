import { ConflictException, NotFoundException } from '@nestjs/common';
import { CancelSessionResultsUseCase } from './cancel-session-results.use-case';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const SESSION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PHASE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const EVENT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const USER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const QIMELA_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CREATOR_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const SUBSCRIBER_ID = '11111111-1111-1111-1111-111111111111';
const HOME_CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
const AWAY_CATEGORY_ID = '33333333-3333-3333-3333-333333333333';

const makeSession = (overrides = {}) => ({
  id: SESSION_ID,
  status: 'COMPLETED',
  phaseId: PHASE_ID,
  phase: { eventId: EVENT_ID },
  ...overrides,
});

describe('CancelSessionResultsUseCase', () => {
  let useCase: CancelSessionResultsUseCase;
  let mockPrisma: {
    session: { findUnique: jest.Mock };
    sessionPickCategory: { findMany: jest.Mock };
    sessionResult: { findMany: jest.Mock };
    qimela: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let txMock: {
    sessionResult: { deleteMany: jest.Mock };
    session: { update: jest.Mock };
    sessionResultAudit: { create: jest.Mock };
    userSessionPoints: { deleteMany: jest.Mock; aggregate: jest.Mock; count: jest.Mock };
    userQimelaPoints: { upsert: jest.Mock };
  };

  beforeEach(() => {
    txMock = {
      sessionResult: { deleteMany: jest.fn() },
      session: { update: jest.fn() },
      sessionResultAudit: { create: jest.fn() },
      userSessionPoints: {
        deleteMany: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { points: 10 } }),
        count: jest.fn().mockResolvedValue(1),
      },
      userQimelaPoints: { upsert: jest.fn() },
    };

    mockPrisma = {
      session: { findUnique: jest.fn() },
      sessionPickCategory: { findMany: jest.fn() },
      sessionResult: { findMany: jest.fn() },
      qimela: { findMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: (tx: typeof txMock) => Promise<void>) => fn(txMock)),
    };

    const mockLogger: any = {
      trace: jest.fn(), debug: jest.fn(), info: jest.fn(),
      warn: jest.fn(), error: jest.fn(), fatal: jest.fn(),
    };

    useCase = new CancelSessionResultsUseCase(
      mockLogger,
      mockPrisma as unknown as PrismaService,
    );
  });

  const command = () => ({
    eventId: EVENT_ID,
    phaseId: PHASE_ID,
    sessionId: SESSION_ID,
    cancelledByUserId: USER_ID,
  });

  it('throws NotFoundException when session does not exist', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(command())).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when session does not belong to the given phase', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(
      makeSession({ phaseId: 'other-phase' }),
    );

    await expect(useCase.execute(command())).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when session does not belong to the given event', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(
      makeSession({ phase: { eventId: 'other-event' } }),
    );

    await expect(useCase.execute(command())).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when session status is not COMPLETED', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession({ status: 'SCHEDULED' }));

    await expect(useCase.execute(command())).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when session status is LIVE', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession({ status: 'LIVE' }));

    await expect(useCase.execute(command())).rejects.toThrow(ConflictException);
  });

  describe('with a valid COMPLETED session', () => {
    beforeEach(() => {
      mockPrisma.session.findUnique.mockResolvedValue(makeSession());

      mockPrisma.sessionPickCategory.findMany.mockResolvedValue([
        { pickCategoryId: HOME_CATEGORY_ID, pickCategory: { id: HOME_CATEGORY_ID, name: 'score_home' } },
        { pickCategoryId: AWAY_CATEGORY_ID, pickCategory: { id: AWAY_CATEGORY_ID, name: 'score_away' } },
      ]);

      mockPrisma.sessionResult.findMany.mockResolvedValue([
        { pickCategoryId: HOME_CATEGORY_ID, value: '2' },
        { pickCategoryId: AWAY_CATEGORY_ID, value: '1' },
      ]);

      mockPrisma.qimela.findMany.mockResolvedValue([
        {
          id: QIMELA_ID,
          creatorId: CREATOR_ID,
          subscriptions: [{ userId: SUBSCRIBER_ID }],
        },
      ]);
    });

    it('deletes session results within the transaction', async () => {
      await useCase.execute(command());

      expect(txMock.sessionResult.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: SESSION_ID },
      });
    });

    it('resets session status to SCHEDULED', async () => {
      await useCase.execute(command());

      expect(txMock.session.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: { status: 'SCHEDULED' },
      });
    });

    it('creates an audit record with the canceller and previous scores', async () => {
      await useCase.execute(command());

      expect(txMock.sessionResultAudit.create).toHaveBeenCalledWith({
        data: {
          sessionId: SESSION_ID,
          cancelledById: USER_ID,
          previousHomeScore: '2',
          previousAwayScore: '1',
        },
      });
    });

    it('uses empty string as previous score when no result exists', async () => {
      mockPrisma.sessionResult.findMany.mockResolvedValue([]);

      await useCase.execute(command());

      expect(txMock.sessionResultAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousHomeScore: '',
          previousAwayScore: '',
        }),
      });
    });

    it('deletes user session points for the cancelled session', async () => {
      await useCase.execute(command());

      expect(txMock.userSessionPoints.deleteMany).toHaveBeenCalledWith({
        where: { sessionId: SESSION_ID, qimelaId: QIMELA_ID },
      });
    });

    it('upserts qimela points for both the creator and all subscribers', async () => {
      await useCase.execute(command());

      const upsertCalls = txMock.userQimelaPoints.upsert.mock.calls.map(
        ([args]: [{ where: { userId_qimelaId: { userId: string } } }]) =>
          args.where.userId_qimelaId.userId,
      );

      expect(upsertCalls).toContain(CREATOR_ID);
      expect(upsertCalls).toContain(SUBSCRIBER_ID);
    });

    it('deduplicates creator when creator is also a subscriber', async () => {
      mockPrisma.qimela.findMany.mockResolvedValue([
        {
          id: QIMELA_ID,
          creatorId: CREATOR_ID,
          subscriptions: [{ userId: CREATOR_ID }],
        },
      ]);

      await useCase.execute(command());

      expect(txMock.userQimelaPoints.upsert).toHaveBeenCalledTimes(1);
    });

    it('runs all writes inside a single transaction', async () => {
      await useCase.execute(command());

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.sessionResult.deleteMany).toHaveBeenCalledTimes(1);
      expect(txMock.session.update).toHaveBeenCalledTimes(1);
      expect(txMock.sessionResultAudit.create).toHaveBeenCalledTimes(1);
    });

    it('queries qimelas filtered by the event id', async () => {
      await useCase.execute(command());

      expect(mockPrisma.qimela.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventId: EVENT_ID } }),
      );
    });
  });
});
