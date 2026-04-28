import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RevokeInviteTokenUseCase } from './revoke-invite-token.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { InviteTokenRepository } from '../../domain/invite-token.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { InviteTokenEntity } from '../../domain/invite-token.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SPORT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const TOKEN_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

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

const makeInviteToken = (overrides: Partial<ConstructorParameters<typeof InviteTokenEntity>[0]> = {}): InviteTokenEntity =>
  new InviteTokenEntity({
    id: TOKEN_ID,
    token: 'a'.repeat(64),
    qimelaId: QIMELA_ID,
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  });

describe('RevokeInviteTokenUseCase', () => {
  let useCase: RevokeInviteTokenUseCase;
  let mockQimelaRepository: jest.Mocked<QimelaRepository>;
  let mockInviteTokenRepository: jest.Mocked<InviteTokenRepository>;

  beforeEach(() => {
    mockQimelaRepository = {
      findById: jest.fn(),
      findForUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockInviteTokenRepository = {
      findByToken: jest.fn(),
      findByQimelaId: jest.fn(),
      upsert: jest.fn(),
      revoke: jest.fn(),
      revokeByQimelaId: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new RevokeInviteTokenUseCase(mockLogger, mockQimelaRepository, mockInviteTokenRepository);
  });

  describe('execute', () => {
    it('throws NotFoundException when qimela not found', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the creator', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: OTHER_USER_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when no invite token exists for the qimela', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());
      mockInviteTokenRepository.findByQimelaId.mockResolvedValue(null);

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when invite token is already revoked', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());
      mockInviteTokenRepository.findByQimelaId.mockResolvedValue(makeInviteToken({ revoked: true }));

      // Act + Assert
      await expect(
        useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('calls revoke with the token id on success', async () => {
      // Arrange
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());
      mockInviteTokenRepository.findByQimelaId.mockResolvedValue(makeInviteToken());
      mockInviteTokenRepository.revoke.mockResolvedValue();

      // Act
      await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID });

      // Assert
      expect(mockInviteTokenRepository.revoke).toHaveBeenCalledWith(TOKEN_ID);
    });
  });
});
