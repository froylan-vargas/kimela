import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { GetLeaderboardUseCase } from './get-leaderboard.use-case';

const QIMELA_ID = 'qimela-1';
const PHASE_ID = 'phase-1';

describe('GetLeaderboardUseCase', () => {
  let useCase: GetLeaderboardUseCase;
  let mockPrisma: {
    qimela: { findUnique: jest.Mock };
    userQimelaPoints: { findMany: jest.Mock };
    userSessionPoints: { findMany: jest.Mock };
  };

  beforeEach(() => {
    mockPrisma = {
      qimela: { findUnique: jest.fn() },
      userQimelaPoints: { findMany: jest.fn() },
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

    useCase = new GetLeaderboardUseCase(
      mockLogger,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('throws NotFoundException when qimela does not exist', async () => {
    mockPrisma.qimela.findUnique.mockResolvedValue(null);

    await expect(useCase.execute(QIMELA_ID)).rejects.toThrow(NotFoundException);
  });

  it('returns all subscribers even when some have no event points yet', async () => {
    mockPrisma.qimela.findUnique.mockResolvedValue({
      id: QIMELA_ID,
      subscriptions: [
        { user: { id: 'ana', name: 'Ana Torres', imageUrl: null } },
        { user: { id: 'luis', name: 'Luis Ramos', imageUrl: null } },
      ],
    });
    mockPrisma.userQimelaPoints.findMany.mockResolvedValue([
      {
        userId: 'ana',
        totalPoints: 8,
        correctPicksCount: 2,
        exactResultsCount: 1,
        user: { id: 'ana', name: 'Ana Torres', imageUrl: null },
      },
    ]);

    const result = await useCase.execute(QIMELA_ID);

    expect(result.data).toEqual([
      expect.objectContaining({ userId: 'ana', totalPoints: 8, rank: 1 }),
      expect.objectContaining({ userId: 'luis', totalPoints: 0, rank: 2 }),
    ]);
  });

  it('does not include the creator as a standalone participant (creator must subscribe)', async () => {
    mockPrisma.qimela.findUnique.mockResolvedValue({
      id: QIMELA_ID,
      subscriptions: [
        { user: { id: 'ana', name: 'Ana Torres', imageUrl: null } },
      ],
    });
    mockPrisma.userQimelaPoints.findMany.mockResolvedValue([]);

    const result = await useCase.execute(QIMELA_ID);

    const userIds = result.data.map((e: { userId: string }) => e.userId);
    expect(userIds).toEqual(['ana']);
    expect(userIds).not.toContain('creator');
  });

  it('returns all subscribers for a phase even before phase scoring exists', async () => {
    mockPrisma.qimela.findUnique.mockResolvedValue({
      id: QIMELA_ID,
      subscriptions: [
        { user: { id: 'ana', name: 'Ana Torres', imageUrl: null } },
        { user: { id: 'luis', name: 'Luis Ramos', imageUrl: null } },
      ],
    });
    mockPrisma.userSessionPoints.findMany.mockResolvedValue([]);

    const result = await useCase.execute(QIMELA_ID, PHASE_ID);

    expect(mockPrisma.userSessionPoints.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { qimelaId: QIMELA_ID, session: { phaseId: PHASE_ID } },
      }),
    );
    expect(result.data).toEqual([
      expect.objectContaining({ userId: 'ana', totalPoints: 0 }),
      expect.objectContaining({ userId: 'luis', totalPoints: 0 }),
    ]);
  });
});
