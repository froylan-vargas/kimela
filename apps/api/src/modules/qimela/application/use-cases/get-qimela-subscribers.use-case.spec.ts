import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetQimelaSubscribersUseCase } from './get-qimela-subscribers.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SPORT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const makeQimela = (overrides: Partial<ConstructorParameters<typeof QimelaEntity>[0]> = {}): QimelaEntity =>
  new QimelaEntity({
    id: QIMELA_ID,
    name: 'Test Qimela',
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

const makeSubscription = (
  userId: string,
  name: string,
  email: string,
  labels: { label: { id: string; name: string; color: string } }[] = [],
) => ({
  user: { id: userId, name, email },
  labels,
});

describe('GetQimelaSubscribersUseCase', () => {
  let useCase: GetQimelaSubscribersUseCase;
  let mockQimelaRepo: jest.Mocked<QimelaRepository>;
  let mockPrisma: { subscription: { count: jest.Mock; findMany: jest.Mock } };

  beforeEach(() => {
    mockQimelaRepo = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      subscription: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    useCase = new GetQimelaSubscribersUseCase(
      mockQimelaRepo,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('execute', () => {
    it('throws NotFoundException when qimela does not exist', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the creator', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: OTHER_ID, page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns an empty list when there are no subscribers', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(0);
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.data.subscribers).toHaveLength(0);
      expect(result.data.total).toBe(0);
    });

    it('maps subscriber rows to userId, name and email', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(2);
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeSubscription('u1', 'Ana Torres', 'ana@example.com'),
        makeSubscription('u2', 'Luis Ramos', 'luis@example.com'),
      ]);

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.data.subscribers).toEqual([
        { userId: 'u1', name: 'Ana Torres', email: 'ana@example.com', labels: [] },
        { userId: 'u2', name: 'Luis Ramos', email: 'luis@example.com', labels: [] },
      ]);
    });

    it('returns correct pagination metadata', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(25);
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        page: 2,
        limit: 10,
      });

      // Assert
      expect(result.data.total).toBe(25);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    });

    it('passes skip and take for the requested page', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(30);
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, page: 3, limit: 10 });

      // Assert
      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('applies search filter by name and email via OR clause', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(0);
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        page: 1,
        limit: 10,
        search: 'ana',
      });

      // Assert
      const expectedWhere = {
        qimelaId: QIMELA_ID,
        OR: [
          { user: { name: { contains: 'ana', mode: 'insensitive' } } },
          { user: { email: { contains: 'ana', mode: 'insensitive' } } },
        ],
      };
      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('omits the search filter when no search term is provided', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(0);
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, page: 1, limit: 10 });

      // Assert
      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: { qimelaId: QIMELA_ID },
      });
    });

    it('maps subscriber labels into id, name and color', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(1);
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeSubscription('u1', 'Ana Torres', 'ana@example.com', [
          { label: { id: 'l1', name: 'VIP', color: '#ff0000' } },
          { label: { id: 'l2', name: 'Casual', color: '#3b82f6' } },
        ]),
      ]);

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.data.subscribers[0].labels).toEqual([
        { id: 'l1', name: 'VIP', color: '#ff0000' },
        { id: 'l2', name: 'Casual', color: '#3b82f6' },
      ]);
    });

    it('returns an empty labels array when a subscriber has no labels', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.count.mockResolvedValue(1);
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeSubscription('u1', 'Ana Torres', 'ana@example.com'),
      ]);

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result.data.subscribers[0].labels).toEqual([]);
    });
  });
});
