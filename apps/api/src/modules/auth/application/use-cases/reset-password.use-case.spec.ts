import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ResetPasswordUseCase } from './reset-password.use-case';
import {
  PasswordResetTokenEntity,
  PasswordResetTokenRepository,
} from '../../domain/password-reset-token.repository';
import { UserRepository } from '../../../users/domain/user.repository';
import {
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';
import { InvalidResetTokenError } from '../../domain/errors/invalid-reset-token.error';

const makeResetToken = (
  overrides: Partial<ConstructorParameters<typeof PasswordResetTokenEntity>[0]> = {},
): PasswordResetTokenEntity =>
  new PasswordResetTokenEntity({
    id: 'tok-1',
    tokenHash: 'some-hash',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  });

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let mockResetTokenRepo: jest.Mocked<PasswordResetTokenRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockRefreshTokenRepo: jest.Mocked<RefreshTokenRepository>;

  beforeEach(() => {
    mockResetTokenRepo = {
      findByHash: jest.fn(),
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

    mockRefreshTokenRepo = {
      findByHash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new ResetPasswordUseCase(mockLogger, mockResetTokenRepo, mockUserRepo, mockRefreshTokenRepo);
  });

  describe('execute', () => {
    it('updates password and marks token as used on valid token', async () => {
      // Arrange
      const rawToken = 'valid-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const validToken = makeResetToken({ tokenHash });
      mockResetTokenRepo.findByHash.mockResolvedValue(validToken);
      mockUserRepo.updatePassword.mockResolvedValue(undefined);
      mockResetTokenRepo.markUsed.mockResolvedValue(undefined);
      mockRefreshTokenRepo.revokeAllByUserId.mockResolvedValue(undefined);

      // Act
      await useCase.execute(rawToken, 'NewPassword1!');

      // Assert
      expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(
        validToken.userId,
        expect.any(String),
      );
      expect(mockResetTokenRepo.markUsed).toHaveBeenCalledWith(validToken.id);
    });

    it('revokes all refresh tokens for the user after password reset', async () => {
      // Arrange
      const rawToken = 'valid-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const validToken = makeResetToken({ tokenHash });
      mockResetTokenRepo.findByHash.mockResolvedValue(validToken);
      mockUserRepo.updatePassword.mockResolvedValue(undefined);
      mockResetTokenRepo.markUsed.mockResolvedValue(undefined);
      mockRefreshTokenRepo.revokeAllByUserId.mockResolvedValue(undefined);

      // Act
      await useCase.execute(rawToken, 'NewPassword1!');

      // Assert
      expect(mockRefreshTokenRepo.revokeAllByUserId).toHaveBeenCalledWith(validToken.userId);
    });

    it('throws InvalidResetTokenError when token not found', async () => {
      // Arrange
      mockResetTokenRepo.findByHash.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('unknown-token', 'NewPassword1!')).rejects.toThrow(
        InvalidResetTokenError,
      );
    });

    it('throws InvalidResetTokenError when token is expired', async () => {
      // Arrange
      const rawToken = 'expired-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiredToken = makeResetToken({
        tokenHash,
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });
      mockResetTokenRepo.findByHash.mockResolvedValue(expiredToken);

      // Act & Assert
      await expect(useCase.execute(rawToken, 'NewPassword1!')).rejects.toThrow(InvalidResetTokenError);
    });

    it('throws InvalidResetTokenError when token already used', async () => {
      // Arrange
      const rawToken = 'used-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const usedToken = makeResetToken({
        tokenHash,
        usedAt: new Date(),
      });
      mockResetTokenRepo.findByHash.mockResolvedValue(usedToken);

      // Act & Assert
      await expect(useCase.execute(rawToken, 'NewPassword1!')).rejects.toThrow(InvalidResetTokenError);
    });

    it('hashes the new password before saving', async () => {
      // Arrange
      const rawToken = 'valid-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const validToken = makeResetToken({ tokenHash });
      const newPassword = 'NewPassword1!';
      mockResetTokenRepo.findByHash.mockResolvedValue(validToken);
      mockUserRepo.updatePassword.mockResolvedValue(undefined);
      mockResetTokenRepo.markUsed.mockResolvedValue(undefined);
      mockRefreshTokenRepo.revokeAllByUserId.mockResolvedValue(undefined);

      // Act
      await useCase.execute(rawToken, newPassword);

      // Assert
      const savedHash: string = mockUserRepo.updatePassword.mock.calls[0][1];
      expect(savedHash).not.toBe(newPassword);
      const isHashed = await bcrypt.compare(newPassword, savedHash);
      expect(isHashed).toBe(true);
    });
  });
});
