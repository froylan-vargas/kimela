import * as crypto from 'crypto';
import { ConfirmEmailUseCase } from './confirm-email.use-case';
import {
  EmailVerificationTokenEntity,
  EmailVerificationTokenRepository,
} from '../../domain/email-verification-token.repository';
import { UserRepository } from '../../../users/domain/user.repository';
import { InvalidVerificationTokenError } from '../../domain/errors/invalid-verification-token.error';

const makeVerificationToken = (
  overrides: Partial<ConstructorParameters<typeof EmailVerificationTokenEntity>[0]> = {},
): EmailVerificationTokenEntity =>
  new EmailVerificationTokenEntity({
    id: 'tok-1',
    tokenHash: 'some-hash',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  });

describe('ConfirmEmailUseCase', () => {
  let useCase: ConfirmEmailUseCase;
  let mockTokenRepo: jest.Mocked<EmailVerificationTokenRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockTokenRepo = {
      findByHash: jest.fn(),
      findLatestByUserId: jest.fn(),
      create: jest.fn(),
      markUsed: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      verifyEmail: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
    };

    useCase = new ConfirmEmailUseCase(mockTokenRepo, mockUserRepo);
  });

  describe('execute', () => {
    it('calls userRepo.verifyEmail and tokenRepo.markUsed on valid token', async () => {
      // Arrange
      const rawToken = 'valid-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const validToken = makeVerificationToken({ tokenHash });
      mockTokenRepo.findByHash.mockResolvedValue(validToken);
      mockUserRepo.verifyEmail.mockResolvedValue(undefined);
      mockTokenRepo.markUsed.mockResolvedValue(undefined);

      // Act
      await useCase.execute(rawToken);

      // Assert
      expect(mockUserRepo.verifyEmail).toHaveBeenCalledWith(validToken.userId);
      expect(mockTokenRepo.markUsed).toHaveBeenCalledWith(validToken.id);
    });

    it('throws InvalidVerificationTokenError when token not found', async () => {
      // Arrange
      mockTokenRepo.findByHash.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('some-raw-token')).rejects.toThrow(InvalidVerificationTokenError);
    });

    it('throws InvalidVerificationTokenError when token is expired', async () => {
      // Arrange
      const rawToken = 'expired-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiredToken = makeVerificationToken({
        tokenHash,
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });
      mockTokenRepo.findByHash.mockResolvedValue(expiredToken);

      // Act & Assert
      await expect(useCase.execute(rawToken)).rejects.toThrow(InvalidVerificationTokenError);
    });

    it('throws InvalidVerificationTokenError when token already used', async () => {
      // Arrange
      const rawToken = 'used-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const usedToken = makeVerificationToken({
        tokenHash,
        usedAt: new Date(),
      });
      mockTokenRepo.findByHash.mockResolvedValue(usedToken);

      // Act & Assert
      await expect(useCase.execute(rawToken)).rejects.toThrow(InvalidVerificationTokenError);
    });

    it('looks up token by SHA-256 hash of the raw token, not the raw token itself', async () => {
      // Arrange
      const rawToken = 'my-raw-token';
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      mockTokenRepo.findByHash.mockResolvedValue(null);

      // Act
      await useCase.execute(rawToken).catch(() => {});

      // Assert
      expect(mockTokenRepo.findByHash).toHaveBeenCalledWith(expectedHash);
      expect(mockTokenRepo.findByHash).not.toHaveBeenCalledWith(rawToken);
    });
  });
});
