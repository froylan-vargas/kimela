import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import {
  RefreshTokenEntity,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';

const makeRefreshToken = (
  overrides: Partial<ConstructorParameters<typeof RefreshTokenEntity>[0]> = {},
): RefreshTokenEntity =>
  new RefreshTokenEntity({
    id: 'tok-1',
    tokenHash: 'some-hash',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  });

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockRefreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  beforeEach(() => {
    mockRefreshTokenRepository = {
      findByHash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new RefreshTokenUseCase(mockLogger, mockRefreshTokenRepository);
  });

  describe('execute', () => {
    it('returns new refresh token and userId on valid token', async () => {
      // Arrange
      const rawToken = 'valid-incoming-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const storedToken = makeRefreshToken({ tokenHash, userId: 'user-1' });
      mockRefreshTokenRepository.findByHash.mockResolvedValue(storedToken);
      mockRefreshTokenRepository.revoke.mockResolvedValue(undefined);
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(rawToken);

      // Assert
      expect(result.userId).toBe('user-1');
      expect(typeof result.newRefreshToken).toBe('string');
      expect(result.newRefreshToken.length).toBeGreaterThan(0);
    });

    it('revokes the old token and creates a new one (rotation)', async () => {
      // Arrange
      const rawToken = 'valid-incoming-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const storedToken = makeRefreshToken({ tokenHash });
      mockRefreshTokenRepository.findByHash.mockResolvedValue(storedToken);
      mockRefreshTokenRepository.revoke.mockResolvedValue(undefined);
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);

      // Act
      await useCase.execute(rawToken);

      // Assert
      expect(mockRefreshTokenRepository.revoke).toHaveBeenCalledWith(storedToken.id);
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledTimes(1);

      // Revoke must happen before create
      const revokeOrder = mockRefreshTokenRepository.revoke.mock.invocationCallOrder[0];
      const createOrder = mockRefreshTokenRepository.create.mock.invocationCallOrder[0];
      expect(revokeOrder).toBeLessThan(createOrder);
    });

    it('throws UnauthorizedException when token not found', async () => {
      // Arrange
      mockRefreshTokenRepository.findByHash.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('unknown-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is expired', async () => {
      // Arrange
      const rawToken = 'expired-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiredToken = makeRefreshToken({
        tokenHash,
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      });
      mockRefreshTokenRepository.findByHash.mockResolvedValue(expiredToken);

      // Act & Assert
      await expect(useCase.execute(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is revoked', async () => {
      // Arrange
      const rawToken = 'revoked-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const revokedToken = makeRefreshToken({
        tokenHash,
        revokedAt: new Date(),
      });
      mockRefreshTokenRepository.findByHash.mockResolvedValue(revokedToken);

      // Act & Assert
      await expect(useCase.execute(rawToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
