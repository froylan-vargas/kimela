import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GenerateInviteTokenUseCase } from './generate-invite-token.use-case';
import { QimelaRepository } from '../../domain/qimela.repository';
import { InviteTokenRepository } from '../../domain/invite-token.repository';
import { QimelaEntity } from '../../domain/qimela.entity';
import { InviteTokenEntity } from '../../domain/invite-token.entity';
import { QimelaStatus } from '../../domain/qimela-status.enum';

const QIMELA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CREATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
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

const makeInviteToken = (overrides: Partial<ConstructorParameters<typeof InviteTokenEntity>[0]> = {}): InviteTokenEntity =>
  new InviteTokenEntity({
    id: 'token-id-hex',
    token: 'a'.repeat(64),
    qimelaId: QIMELA_ID,
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  });

describe('GenerateInviteTokenUseCase', () => {
  let useCase: GenerateInviteTokenUseCase;
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

        useCase = new GenerateInviteTokenUseCase(mockLogger, mockQimelaRepository, mockInviteTokenRepository);
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

    it('returns existing active token without calling upsert', async () => {
      // Arrange
      const activeToken = makeInviteToken({ token: 'b'.repeat(64) });
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());
      mockInviteTokenRepository.findByQimelaId.mockResolvedValue(activeToken);

      // Act
      const result = await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID });

      // Assert
      expect(result.data.token).toBe('b'.repeat(64));
      expect(mockInviteTokenRepository.upsert).not.toHaveBeenCalled();
    });

    it('creates new token via upsert when no existing token', async () => {
      // Arrange
      const newToken = makeInviteToken({ token: 'c'.repeat(64) });
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());
      mockInviteTokenRepository.findByQimelaId.mockResolvedValue(null);
      mockInviteTokenRepository.upsert.mockResolvedValue(newToken);

      // Act
      const result = await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID });

      // Assert
      expect(mockInviteTokenRepository.upsert).toHaveBeenCalledTimes(1);
      expect(result.data.token).toBe('c'.repeat(64));
    });

    it('creates new token via upsert when existing token is revoked', async () => {
      // Arrange
      const revokedToken = makeInviteToken({ revoked: true });
      const newToken = makeInviteToken({ token: 'd'.repeat(64) });
      mockQimelaRepository.findById.mockResolvedValue(makeQimela());
      mockInviteTokenRepository.findByQimelaId.mockResolvedValue(revokedToken);
      mockInviteTokenRepository.upsert.mockResolvedValue(newToken);

      // Act
      const result = await useCase.execute({ qimelaId: QIMELA_ID, requesterId: CREATOR_ID });

      // Assert
      expect(mockInviteTokenRepository.upsert).toHaveBeenCalledTimes(1);
      expect(result.data.token).toBe('d'.repeat(64));
    });
  });
});
