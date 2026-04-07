import * as bcrypt from 'bcrypt';
import { RegisterUserUseCase } from './register-user.use-case';
import { UserRepository } from '../../../users/domain/user.repository';
import { UserEntity } from '../../../users/domain/user.entity';
import { UserRole } from '../../../users/domain/user-role.enum';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { RegisterDto } from '../dtos/register.dto';
import { SendVerificationEmailUseCase } from './send-verification-email.use-case';

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

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockSendVerificationEmailUseCase: jest.Mocked<SendVerificationEmailUseCase>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      verifyEmail: jest.fn(),
      updatePassword: jest.fn(),
    };

    mockSendVerificationEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SendVerificationEmailUseCase>;

    useCase = new RegisterUserUseCase(mockUserRepository, mockSendVerificationEmailUseCase);
  });

  describe('execute', () => {
    const dto: RegisterDto = {
      email: 'new@example.com',
      name: 'NewUser',
      password: 'Password1!',
    };

    it('creates user and returns entity when email is new', async () => {
      // Arrange
      const createdUser = makeUser({ email: dto.email, name: dto.name });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockSendVerificationEmailUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result).toBe(createdUser);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
    });

    it('throws EmailAlreadyExistsError when email already exists', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(makeUser({ email: dto.email }));

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(EmailAlreadyExistsError);
    });

    it('hashes password before saving', async () => {
      // Arrange
      const createdUser = makeUser({ email: dto.email });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockSendVerificationEmailUseCase.execute.mockResolvedValue(undefined);

      // Act
      await useCase.execute(dto);

      // Assert
      const createdEntity: UserEntity = mockUserRepository.create.mock.calls[0][0];
      expect(createdEntity.passwordHash).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(dto.password, createdEntity.passwordHash);
      expect(isHashed).toBe(true);
    });

    it('sets role to USER always', async () => {
      // Arrange
      const createdUser = makeUser({ role: UserRole.USER });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockSendVerificationEmailUseCase.execute.mockResolvedValue(undefined);

      // Act
      await useCase.execute(dto);

      // Assert
      const createdEntity: UserEntity = mockUserRepository.create.mock.calls[0][0];
      expect(createdEntity.role).toBe(UserRole.USER);
    });

    it('sets emailVerifiedAt to null on new user', async () => {
      // Arrange
      const createdUser = makeUser({ emailVerifiedAt: null });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockSendVerificationEmailUseCase.execute.mockResolvedValue(undefined);

      // Act
      await useCase.execute(dto);

      // Assert
      const createdEntity: UserEntity = mockUserRepository.create.mock.calls[0][0];
      expect(createdEntity.emailVerifiedAt).toBeNull();
    });

    it('calls sendVerificationEmailUseCase after creating user', async () => {
      // Arrange
      const createdUser = makeUser({ email: dto.email });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockSendVerificationEmailUseCase.execute.mockResolvedValue(undefined);

      // Act
      await useCase.execute(dto);

      // Need a small wait since fire-and-forget is a void promise
      await new Promise(resolve => setImmediate(resolve));

      // Assert
      expect(mockSendVerificationEmailUseCase.execute).toHaveBeenCalledWith(createdUser);
    });
  });
});
