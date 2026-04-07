import * as bcrypt from 'bcrypt';
import { LoginUserUseCase } from './login-user.use-case';
import { UserRepository } from '../../../users/domain/user.repository';
import { UserEntity } from '../../../users/domain/user.entity';
import { UserRole } from '../../../users/domain/user-role.enum';
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
    };

    useCase = new LoginUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('returns user when credentials are valid', async () => {
      // Arrange
      const user = makeUser();
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
