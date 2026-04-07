import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case';
import { SendVerificationEmailUseCase } from '../application/use-cases/send-verification-email.use-case';
import { ConfirmEmailUseCase } from '../application/use-cases/confirm-email.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { REFRESH_TOKEN_REPOSITORY } from '../domain/refresh-token.repository';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { CurrentUserPayload } from './decorators/current-user.decorator';
import { EmailAlreadyExistsError } from '../domain/errors/email-already-exists.error';
import { InvalidVerificationTokenError } from '../domain/errors/invalid-verification-token.error';
import { InvalidResetTokenError } from '../domain/errors/invalid-reset-token.error';

function makeMockRes() {
  const res = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const makeUser = (overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {}): UserEntity =>
  new UserEntity({
    id: 'user-1',
    email: 'test@example.com',
    name: 'TestUser',
    passwordHash: 'hash',
    role: UserRole.USER,
    emailVerifiedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

const MOCK_USER_PAYLOAD: CurrentUserPayload = {
  id: 'user-1',
  email: 'test@example.com',
  role: UserRole.USER,
  emailVerifiedAt: null,
};

describe('AuthController', () => {
  let controller: AuthController;
  let mockJwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let mockRegisterUserUseCase: { execute: jest.Mock };
  let mockRefreshTokenUseCase: { execute: jest.Mock };
  let mockLogoutUserUseCase: { execute: jest.Mock };
  let mockSendVerificationEmailUseCase: { execute: jest.Mock };
  let mockConfirmEmailUseCase: { execute: jest.Mock };
  let mockRequestPasswordResetUseCase: { execute: jest.Mock };
  let mockResetPasswordUseCase: { execute: jest.Mock };
  let mockRefreshTokenRepository: { create: jest.Mock; findByHash: jest.Mock };
  let mockUserRepository: { findById: jest.Mock; findByEmail: jest.Mock };

  beforeEach(async () => {
    mockJwtService = { sign: jest.fn().mockReturnValue('mock-access-token') };
    mockRegisterUserUseCase = { execute: jest.fn() };
    mockRefreshTokenUseCase = { execute: jest.fn() };
    mockLogoutUserUseCase = { execute: jest.fn() };
    mockSendVerificationEmailUseCase = { execute: jest.fn() };
    mockConfirmEmailUseCase = { execute: jest.fn() };
    mockRequestPasswordResetUseCase = { execute: jest.fn() };
    mockResetPasswordUseCase = { execute: jest.fn() };
    mockRefreshTokenRepository = { create: jest.fn(), findByHash: jest.fn() };
    mockUserRepository = { findById: jest.fn(), findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: JwtService, useValue: mockJwtService },
        { provide: RegisterUserUseCase, useValue: mockRegisterUserUseCase },
        { provide: RefreshTokenUseCase, useValue: mockRefreshTokenUseCase },
        { provide: LogoutUserUseCase, useValue: mockLogoutUserUseCase },
        { provide: SendVerificationEmailUseCase, useValue: mockSendVerificationEmailUseCase },
        { provide: ConfirmEmailUseCase, useValue: mockConfirmEmailUseCase },
        { provide: RequestPasswordResetUseCase, useValue: mockRequestPasswordResetUseCase },
        { provide: ResetPasswordUseCase, useValue: mockResetPasswordUseCase },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: mockRefreshTokenRepository },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ─── POST /auth/register ────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    const registerDto = {
      email: 'new@example.com',
      name: 'NewUser',
      password: 'Password1!',
    };

    it('returns 201 with user data on success', async () => {
      // Arrange
      const user = makeUser({ email: registerDto.email, name: registerDto.name });
      mockRegisterUserUseCase.execute.mockResolvedValue(user);
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      const res = makeMockRes();

      // Act
      await controller.register(registerDto as any, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }),
      );
    });

    it('throws ConflictException when EmailAlreadyExistsError is thrown', async () => {
      // Arrange
      mockRegisterUserUseCase.execute.mockRejectedValue(new EmailAlreadyExistsError());
      const res = makeMockRes();

      // Act & Assert
      await expect(controller.register(registerDto as any, res)).rejects.toThrow(ConflictException);
    });

    it('sets access_token and refresh_token cookies on success', async () => {
      // Arrange
      const user = makeUser({ email: registerDto.email });
      mockRegisterUserUseCase.execute.mockResolvedValue(user);
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      const res = makeMockRes();

      // Act
      await controller.register(registerDto as any, res);

      // Assert
      const cookieCalls = (res.cookie as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(cookieCalls).toContain('access_token');
      expect(cookieCalls).toContain('refresh_token');
    });
  });

  // ─── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('returns 200 with user data on success', async () => {
      // Arrange
      const user = makeUser();
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      const req = { user } as any;
      const res = makeMockRes();

      // Act
      await controller.login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: user.id,
          email: user.email,
          name: user.name,
        }),
      );
    });

    it('sets auth cookies on successful login', async () => {
      // Arrange
      const user = makeUser();
      mockRefreshTokenRepository.create.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      const req = { user } as any;
      const res = makeMockRes();

      // Act
      await controller.login(req, res);

      // Assert
      const cookieCalls = (res.cookie as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(cookieCalls).toContain('access_token');
      expect(cookieCalls).toContain('refresh_token');
    });
  });

  // ─── POST /auth/refresh ─────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns 200 with user data on valid refresh token', async () => {
      // Arrange
      const user = makeUser();
      mockRefreshTokenUseCase.execute.mockResolvedValue({ userId: user.id, newRefreshToken: 'new-token' });
      mockUserRepository.findById.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      const req = { cookies: { refresh_token: 'valid-refresh-token' } } as any;
      const res = makeMockRes();

      // Act
      await controller.refresh(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id, email: user.email }),
      );
    });

    it('throws UnauthorizedException when no refresh token cookie', async () => {
      // Arrange
      const req = { cookies: {} } as any;
      const res = makeMockRes();

      // Act & Assert
      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── POST /auth/logout ──────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 204 and clears cookies', async () => {
      // Arrange
      mockLogoutUserUseCase.execute.mockResolvedValue(undefined);
      const req = { cookies: { refresh_token: 'some-token' } } as any;
      const res = makeMockRes();

      // Act
      await controller.logout(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(204);
      const clearCookieCalls = (res.clearCookie as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
      expect(clearCookieCalls).toContain('access_token');
      expect(clearCookieCalls).toContain('refresh_token');
    });

    it('does not throw when no refresh token cookie is present', async () => {
      // Arrange
      const req = { cookies: {} } as any;
      const res = makeMockRes();

      // Act & Assert
      await expect(controller.logout(req, res)).resolves.toBeUndefined();
      expect(mockLogoutUserUseCase.execute).not.toHaveBeenCalled();
    });
  });

  // ─── GET /auth/me ───────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('returns user payload when authenticated', async () => {
      // Arrange
      const user = makeUser();
      mockUserRepository.findById.mockResolvedValue(user);

      // Act
      const result = await controller.me(MOCK_USER_PAYLOAD);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({ id: user.id, email: user.email, role: user.role }),
      );
    });

    it('throws UnauthorizedException when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.me(MOCK_USER_PAYLOAD)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── POST /auth/confirm-email ───────────────────────────────────────────────

  describe('POST /auth/confirm-email', () => {
    it('returns 200 with success message on valid token', async () => {
      // Arrange
      mockConfirmEmailUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.confirmEmail({ token: 'valid-token' });

      // Assert
      expect(result).toEqual({ message: 'Email confirmed successfully' });
    });

    it('throws BadRequestException when InvalidVerificationTokenError is thrown', async () => {
      // Arrange
      mockConfirmEmailUseCase.execute.mockRejectedValue(new InvalidVerificationTokenError());

      // Act & Assert
      await expect(controller.confirmEmail({ token: 'bad-token' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── POST /auth/resend-verification ────────────────────────────────────────

  describe('POST /auth/resend-verification', () => {
    it('calls sendVerificationEmailUseCase.execute and returns success message', async () => {
      // Arrange
      const user = makeUser();
      mockUserRepository.findById.mockResolvedValue(user);
      mockSendVerificationEmailUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.resendVerification(MOCK_USER_PAYLOAD);

      // Assert
      expect(mockSendVerificationEmailUseCase.execute).toHaveBeenCalledWith(user);
      expect(result).toEqual({ message: 'Verification email sent' });
    });
  });

  // ─── POST /auth/forgot-password ────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('always returns 200 with generic message even for non-existent email', async () => {
      // Arrange
      mockRequestPasswordResetUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.forgotPassword({ email: 'anyone@example.com' });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({ message: expect.any(String) }),
      );
      expect(mockRequestPasswordResetUseCase.execute).toHaveBeenCalledWith('anyone@example.com');
    });
  });

  // ─── POST /auth/reset-password ─────────────────────────────────────────────

  describe('POST /auth/reset-password', () => {
    it('returns 200 with success message on valid token', async () => {
      // Arrange
      mockResetPasswordUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await controller.resetPassword({ token: 'valid-token', password: 'NewPassword1!' });

      // Assert
      expect(result).toEqual({ message: 'Password reset successfully' });
    });

    it('throws BadRequestException when InvalidResetTokenError is thrown', async () => {
      // Arrange
      mockResetPasswordUseCase.execute.mockRejectedValue(new InvalidResetTokenError());

      // Act & Assert
      await expect(
        controller.resetPassword({ token: 'bad-token', password: 'NewPassword1!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
