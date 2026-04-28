import * as crypto from 'crypto';
import { SendVerificationEmailUseCase } from './send-verification-email.use-case';
import {
  EmailVerificationTokenEntity,
  EmailVerificationTokenRepository,
} from '../../domain/email-verification-token.repository';
import { EmailService } from '../services/email.service';
import { UserEntity } from '../../../users/domain/user.entity';
import { UserRole } from '../../../users/domain/user-role.enum';

const makeUser = (overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {}): UserEntity =>
  new UserEntity({
    id: 'user-1',
    email: 'test@example.com',
    name: 'TestUser',
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    emailVerifiedAt: null,
    imageUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

describe('SendVerificationEmailUseCase', () => {
  let useCase: SendVerificationEmailUseCase;
  let mockTokenRepo: jest.Mocked<EmailVerificationTokenRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockTokenRepo = {
      findByHash: jest.fn(),
      findLatestByUserId: jest.fn(),
      create: jest.fn(),
      markUsed: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new SendVerificationEmailUseCase(mockLogger, mockTokenRepo, mockEmailService);
  });

  describe('execute', () => {
    it('deletes existing tokens for the user before creating a new one', async () => {
      // Arrange
      const user = makeUser();
      mockTokenRepo.findLatestByUserId.mockResolvedValue(null);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user);

      // Assert
      expect(mockTokenRepo.deleteByUserId).toHaveBeenCalledWith(user.id);
      const deleteOrder = mockTokenRepo.deleteByUserId.mock.invocationCallOrder[0];
      const createOrder = mockTokenRepo.create.mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(createOrder);
    });

    it('creates a new token with correct userId and 24h expiry', async () => {
      // Arrange
      const user = makeUser();
      const beforeCall = Date.now();
      mockTokenRepo.findLatestByUserId.mockResolvedValue(null);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user);

      // Assert
      const afterCall = Date.now();
      const createdToken = mockTokenRepo.create.mock.calls[0][0];
      expect(createdToken.userId).toBe(user.id);

      const expectedMinExpiry = beforeCall + 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = afterCall + 24 * 60 * 60 * 1000;
      expect(createdToken.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(createdToken.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('stores a SHA-256 hash, not the raw token', async () => {
      // Arrange
      const user = makeUser();
      mockTokenRepo.findLatestByUserId.mockResolvedValue(null);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);

      let capturedConfirmUrl = '';
      mockEmailService.sendVerificationEmail.mockImplementation(
        (_email, _name, confirmUrl) => {
          capturedConfirmUrl = confirmUrl;
          return Promise.resolve(undefined);
        },
      );

      // Act
      await useCase.execute(user);

      // Assert
      const createdToken = mockTokenRepo.create.mock.calls[0][0];
      // Extract token from URL string (format: .../confirm-email?token=<rawToken>)
      const tokenMatch = capturedConfirmUrl.match(/[?&]token=([^&]+)/);
      const rawTokenFromUrl = tokenMatch![1];
      const expectedHash = crypto.createHash('sha256').update(rawTokenFromUrl).digest('hex');
      expect(createdToken.tokenHash).toBe(expectedHash);
      expect(createdToken.tokenHash).not.toBe(rawTokenFromUrl);
    });

    it('calls emailService.sendVerificationEmail with correct email and name', async () => {
      // Arrange
      const user = makeUser({ email: 'user@qimela.com', name: 'QimelaUser' });
      mockTokenRepo.findLatestByUserId.mockResolvedValue(null);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user);

      // Assert
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        user.email,
        user.name,
        expect.any(String),
      );
    });

    it('the confirmUrl passed to emailService contains /confirm-email?token=', async () => {
      // Arrange
      const user = makeUser();
      mockTokenRepo.findLatestByUserId.mockResolvedValue(null);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user);

      // Assert
      const confirmUrl: string = mockEmailService.sendVerificationEmail.mock.calls[0][2];
      expect(confirmUrl).toContain('/confirm-email?token=');
    });

    it('skips sending a new email while resend cooldown is active', async () => {
      const user = makeUser();
      mockTokenRepo.findLatestByUserId.mockResolvedValue(
        new EmailVerificationTokenEntity({
          id: 'token-1',
          tokenHash: 'hash',
          userId: user.id,
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
          createdAt: new Date(Date.now() - 30_000),
        }),
      );

      await useCase.execute(user);

      expect(mockTokenRepo.deleteByUserId).not.toHaveBeenCalled();
      expect(mockTokenRepo.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
