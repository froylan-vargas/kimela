import * as bcrypt from 'bcrypt';
import { LoginUserUseCase } from './login-user.use-case';
import { UserRepository } from '../../../users/domain/user.repository';
import { UserEntity } from '../../../users/domain/user.entity';
import { UserRole } from '../../../users/domain/user-role.enum';
import { EmailNotVerifiedError } from '../../domain/errors/email-not-verified.error';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';

const VALID_PASSWORD = 'Password1!';

const makeUser = (overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {}): UserEntity =>
  new UserEntity({
    id: 'user-1',
    email: 'test@example.com',
    name: 'TestUser',
    passwordHash: bcrypt.hashSync(VALID_PASSWORD, 10),
    role: UserRole.USER,
    emailVerifiedAt: null,
    imageUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      verifyEmail: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new LoginUserUseCase(mockLogger, mockUserRepository);
  });

  describe('execute', () => {
    it('returns user when credentials are valid', async () => {
      // Arrange
      const user = makeUser({ emailVerifiedAt: new Date('2026-01-02T00:00:00Z') });
      mockUserRepository.findByEmail.mockResolvedValue(user);

      // Act
      const result = await useCase.execute(user.email, VALID_PASSWORD);

      // Assert
      expect(result).toBe(user);
    });

    it('throws InvalidCredentialsError when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute('nonexistent@example.com', VALID_PASSWORD)).rejects.toThrow(
        InvalidCredentialsError,
      );
    });

    it('throws InvalidCredentialsError when password does not match', async () => {
      // Arrange
      const user = makeUser();
      mockUserRepository.findByEmail.mockResolvedValue(user);

      // Act & Assert
      await expect(useCase.execute(user.email, 'WrongPassword1!')).rejects.toThrow(
        InvalidCredentialsError,
      );
    });

    it('throws EmailNotVerifiedError when credentials are valid but email is not verified', async () => {
      const originalValue = process.env.REQUIRE_EMAIL_VERIFICATION;
      process.env.REQUIRE_EMAIL_VERIFICATION = 'true';

      const user = makeUser({ emailVerifiedAt: null });
      mockUserRepository.findByEmail.mockResolvedValue(user);

      await expect(useCase.execute(user.email, VALID_PASSWORD)).rejects.toThrow(
        EmailNotVerifiedError,
      );

      process.env.REQUIRE_EMAIL_VERIFICATION = originalValue;
    });

    it('allows login without email verification when REQUIRE_EMAIL_VERIFICATION=false', async () => {
      const originalValue = process.env.REQUIRE_EMAIL_VERIFICATION;
      process.env.REQUIRE_EMAIL_VERIFICATION = 'false';

      const user = makeUser({ emailVerifiedAt: null });
      mockUserRepository.findByEmail.mockResolvedValue(user);

      const result = await useCase.execute(user.email, VALID_PASSWORD);
      expect(result).toBe(user);

      process.env.REQUIRE_EMAIL_VERIFICATION = originalValue;
    });

    it('does not distinguish between user not found and wrong password (same error class)', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const user = makeUser();
      mockUserRepository.findByEmail.mockResolvedValueOnce(null);

      // Act
      const notFoundError = await useCase.execute('no@example.com', VALID_PASSWORD).catch(e => e);

      mockUserRepository.findByEmail.mockResolvedValueOnce(user);
      const wrongPasswordError = await useCase.execute(user.email, 'WrongPassword1!').catch(e => e);

      // Assert
      expect(notFoundError).toBeInstanceOf(InvalidCredentialsError);
      expect(wrongPasswordError).toBeInstanceOf(InvalidCredentialsError);
      expect(notFoundError.constructor).toBe(wrongPasswordError.constructor);
    });
  });
});
