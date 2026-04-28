import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RemoveSubscriptionUseCase } from './remove-subscription.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TARGET_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const OTHER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const SUBSCRIPTION_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const SPORT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

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

describe('RemoveSubscriptionUseCase', () => {
  let useCase: RemoveSubscriptionUseCase;
  let mockQimelaRepo: jest.Mocked<QimelaRepository>;
  let mockPrisma: { subscription: { findUnique: jest.Mock; delete: jest.Mock } };

  beforeEach(() => {
    mockQimelaRepo = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      subscription: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new RemoveSubscriptionUseCase(mockLogger, 
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
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, targetUserId: TARGET_USER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the creator', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: OTHER_ID, targetUserId: TARGET_USER_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when subscription does not exist', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, targetUserId: TARGET_USER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('looks up the subscription by userId and qimelaId composite key', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: SUBSCRIPTION_ID });
      mockPrisma.subscription.delete.mockResolvedValue({});

      // Act
      await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, targetUserId: TARGET_USER_ID });

      // Assert
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId_qimelaId: { userId: TARGET_USER_ID, qimelaId: QIMELA_ID } },
      });
    });

    it('deletes the subscription by its id', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: SUBSCRIPTION_ID });
      mockPrisma.subscription.delete.mockResolvedValue({});

      // Act
      await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID, targetUserId: TARGET_USER_ID });

      // Assert
      expect(mockPrisma.subscription.delete).toHaveBeenCalledWith({
        where: { id: SUBSCRIPTION_ID },
      });
    });

    it('returns { data: { removed: true } } on success', async () => {
      // Arrange
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: SUBSCRIPTION_ID });
      mockPrisma.subscription.delete.mockResolvedValue({});

      // Act
      const result = await useCase.execute({
        qimelaId: QIMELA_ID,
        requesterId: CREATOR_ID,
        targetUserId: TARGET_USER_ID,
      });

      // Assert
      expect(result).toEqual({ data: { removed: true } });
    });
  });
});
