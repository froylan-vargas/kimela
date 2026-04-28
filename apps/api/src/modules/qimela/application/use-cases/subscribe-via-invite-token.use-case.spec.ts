import {
  ConflictException,
  GoneException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SubscribeViaInviteTokenUseCase } from './subscribe-via-invite-token.use-case';
import { InviteTokenRepository } from '../../domain/invite-token.repository';
import { QimelaRepository } from '../../domain/qimela.repository';
import { InviteTokenEntity } from '../../domain/invite-token.entity';
import { QimelaEntity } from '../../domain/qimela.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SPORT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const TOKEN_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const SUBSCRIPTION_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const VALID_TOKEN = 'a'.repeat(64);

const makeInviteToken = (overrides: Partial<ConstructorParameters<typeof InviteTokenEntity>[0]> = {}): InviteTokenEntity =>
  new InviteTokenEntity({
    id: TOKEN_ID,
    token: VALID_TOKEN,
    qimelaId: QIMELA_ID,
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  });

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

describe('SubscribeViaInviteTokenUseCase', () => {
  let useCase: SubscribeViaInviteTokenUseCase;
  let mockInviteTokenRepo: jest.Mocked<InviteTokenRepository>;
  let mockQimelaRepo: jest.Mocked<QimelaRepository>;
  let mockPrisma: { subscription: { create: jest.Mock } };

  beforeEach(() => {
    mockInviteTokenRepo = {
      findByToken: jest.fn(),
      findByQimelaId: jest.fn(),
      upsert: jest.fn(),
      revoke: jest.fn(),
      revokeByQimelaId: jest.fn(),
    };

    mockQimelaRepo = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPrisma = {
      subscription: { create: jest.fn() },
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new SubscribeViaInviteTokenUseCase(mockLogger, 
      mockInviteTokenRepo,
      mockQimelaRepo,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('execute', () => {
    it('throws NotFoundException when token not found', async () => {
      // Arrange
      mockInviteTokenRepo.findByToken.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ token: VALID_TOKEN, userId: USER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws GoneException when token is revoked', async () => {
      // Arrange
      mockInviteTokenRepo.findByToken.mockResolvedValue(makeInviteToken({ revoked: true }));

      // Act + Assert
      await expect(
        useCase.execute({ token: VALID_TOKEN, userId: USER_ID }),
      ).rejects.toThrow(GoneException);
    });

    it('throws NotFoundException when qimela not found', async () => {
      // Arrange
      mockInviteTokenRepo.findByToken.mockResolvedValue(makeInviteToken());
      mockQimelaRepo.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ token: VALID_TOKEN, userId: USER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when qimela is not UPCOMING', async () => {
      // Arrange
      mockInviteTokenRepo.findByToken.mockResolvedValue(makeInviteToken());
      mockQimelaRepo.findById.mockResolvedValue(makeQimela({ status: QimelaStatus.ACTIVE }));

      // Act + Assert
      await expect(
        useCase.execute({ token: VALID_TOKEN, userId: USER_ID }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows the creator to subscribe to their own qimela', async () => {
      mockInviteTokenRepo.findByToken.mockResolvedValue(makeInviteToken());
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.create.mockResolvedValue({ id: SUBSCRIPTION_ID });

      const result = await useCase.execute({
        token: VALID_TOKEN,
        userId: CREATOR_ID,
      });

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: { userId: CREATOR_ID, qimelaId: QIMELA_ID },
      });
      expect(result).toEqual({ data: { subscriptionId: SUBSCRIPTION_ID } });
    });

    it('throws ConflictException when Prisma throws a P2002 unique constraint error', async () => {
      // Arrange
      mockInviteTokenRepo.findByToken.mockResolvedValue(makeInviteToken());
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      const prismaUniqueError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockPrisma.subscription.create.mockRejectedValue(prismaUniqueError);

      // Act + Assert
      await expect(
        useCase.execute({ token: VALID_TOKEN, userId: USER_ID }),
      ).rejects.toThrow(ConflictException);
    });

    it('calls prisma.subscription.create with correct userId and qimelaId', async () => {
      // Arrange
      mockInviteTokenRepo.findByToken.mockResolvedValue(makeInviteToken());
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.create.mockResolvedValue({ id: SUBSCRIPTION_ID });

      // Act
      await useCase.execute({ token: VALID_TOKEN, userId: USER_ID });

      // Assert
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, qimelaId: QIMELA_ID },
      });
    });

    it('returns { data: { subscriptionId } } on success', async () => {
      // Arrange
      mockInviteTokenRepo.findByToken.mockResolvedValue(makeInviteToken());
      mockQimelaRepo.findById.mockResolvedValue(makeQimela());
      mockPrisma.subscription.create.mockResolvedValue({ id: SUBSCRIPTION_ID });

      // Act
      const result = await useCase.execute({ token: VALID_TOKEN, userId: USER_ID });

      // Assert
      expect(result).toEqual({ data: { subscriptionId: SUBSCRIPTION_ID } });
    });
  });
});
