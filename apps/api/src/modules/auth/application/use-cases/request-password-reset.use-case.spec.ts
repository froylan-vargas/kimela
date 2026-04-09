import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import {
  PasswordResetTokenRepository,
} from '../../domain/password-reset-token.repository';
import { EmailService } from '../services/email.service';
import { UserRepository } from '../../../users/domain/user.repository';
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
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

describe('RequestPasswordResetUseCase', () => {
  let useCase: RequestPasswordResetUseCase;
  let mockTokenRepo: jest.Mocked<PasswordResetTokenRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockTokenRepo = {
      findByHash: jest.fn(),
      create: jest.fn(),
      markUsed: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      verifyEmail: jest.fn(),
      updatePassword: jest.fn(),
    };

    useCase = new RequestPasswordResetUseCase(mockTokenRepo, mockEmailService, mockUserRepo);
  });

  describe('execute', () => {
    it('sends reset email when user exists', async () => {
      // Arrange
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user.email);

      // Assert
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        user.email,
        user.name,
        expect.any(String),
      );
    });

    it('silently returns without throwing or sending email when user does not exist', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(null);

      // Act
      await expect(useCase.execute('nonexistent@example.com')).resolves.toBeUndefined();

      // Assert
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('deletes existing tokens before creating a new one', async () => {
      // Arrange
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user.email);

      // Assert
      expect(mockTokenRepo.deleteByUserId).toHaveBeenCalledWith(user.id);
      const deleteOrder = mockTokenRepo.deleteByUserId.mock.invocationCallOrder[0];
      const createOrder = mockTokenRepo.create.mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(createOrder);
    });

    it('token has 1h expiry (not 24h)', async () => {
      // Arrange
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);
      const beforeCall = Date.now();

      // Act
      await useCase.execute(user.email);

      // Assert
      const afterCall = Date.now();
      const createdToken = mockTokenRepo.create.mock.calls[0][0];
      const oneHourMs = 60 * 60 * 1000;
      const expectedMinExpiry = beforeCall + oneHourMs;
      const expectedMaxExpiry = afterCall + oneHourMs;
      expect(createdToken.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(createdToken.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);

      // Must be less than 24h expiry (sanity check)
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      expect(createdToken.expiresAt.getTime()).toBeLessThan(beforeCall + twentyFourHoursMs);
    });

    it('resetUrl contains /reset-password?token=', async () => {
      // Arrange
      const user = makeUser();
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user.email);

      // Assert
      const resetUrl: string = mockEmailService.sendPasswordResetEmail.mock.calls[0][2];
      expect(resetUrl).toContain('/reset-password?token=');
    });

    it('calls emailService.sendPasswordResetEmail with correct email', async () => {
      // Arrange
      const user = makeUser({ email: 'reset@qimela.com' });
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockTokenRepo.deleteByUserId.mockResolvedValue(undefined);
      mockTokenRepo.create.mockResolvedValue(undefined);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      // Act
      await useCase.execute(user.email);

      // Assert
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'reset@qimela.com',
        expect.any(String),
        expect.any(String),
      );
    });
  });
});
