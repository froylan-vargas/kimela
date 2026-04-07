import * as crypto from 'crypto';
import { LogoutUserUseCase } from './logout-user.use-case';
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

describe('LogoutUserUseCase', () => {
  let useCase: LogoutUserUseCase;
  let mockRefreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  beforeEach(() => {
    mockRefreshTokenRepository = {
      findByHash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

    useCase = new LogoutUserUseCase(mockRefreshTokenRepository);
  });

  describe('execute', () => {
    it('revokes token when valid refresh token is provided', async () => {
      // Arrange
      const rawToken = 'valid-refresh-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const storedToken = makeRefreshToken({ tokenHash });
      mockRefreshTokenRepository.findByHash.mockResolvedValue(storedToken);
      mockRefreshTokenRepository.revoke.mockResolvedValue(undefined);

      // Act
      await useCase.execute(rawToken);

      // Assert
      expect(mockRefreshTokenRepository.revoke).toHaveBeenCalledWith(storedToken.id);
    });

    it('does nothing and does not throw when token is not found in DB', async () => {
      // Arrange
      mockRefreshTokenRepository.findByHash.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('unknown-token')).resolves.toBeUndefined();
      expect(mockRefreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
