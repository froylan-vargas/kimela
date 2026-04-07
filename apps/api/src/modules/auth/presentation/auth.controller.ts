import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case';
import { SendVerificationEmailUseCase } from '../application/use-cases/send-verification-email.use-case';
import { ConfirmEmailUseCase } from '../application/use-cases/confirm-email.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { RegisterDto } from '../application/dtos/register.dto';
import { ConfirmEmailDto } from '../application/dtos/confirm-email.dto';
import { ForgotPasswordDto } from '../application/dtos/forgot-password.dto';
import { ResetPasswordDto } from '../application/dtos/reset-password.dto';
import { AuthUserDto } from '../application/dtos/auth-response.dto';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenEntity,
  RefreshTokenRepository,
} from '../domain/refresh-token.repository';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { UserEntity } from '../../users/domain/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../users/domain/user.repository';
import { Inject } from '@nestjs/common';
import { EmailAlreadyExistsError } from '../domain/errors/email-already-exists.error';
import { ConflictException } from '@nestjs/common';
import { InvalidVerificationTokenError } from '../domain/errors/invalid-verification-token.error';
import { InvalidResetTokenError } from '../domain/errors/invalid-reset-token.error';

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly sendVerificationEmailUseCase: SendVerificationEmailUseCase,
    private readonly confirmEmailUseCase: ConfirmEmailUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    this.logger.log(`POST /auth/register - email: ${dto.email}`);

    let user: UserEntity;
    try {
      user = await this.registerUserUseCase.execute(dto);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }

    await this.setAuthCookies(res, user);

    const body: AuthUserDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    };

    res.status(HttpStatus.CREATED).json(body);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Req() req: Request & { user: UserEntity },
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const user = req.user;
    this.logger.log(`POST /auth/login - user: ${user.id}`);

    await this.setAuthCookies(res, user);

    const body: AuthUserDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    };

    res.status(HttpStatus.OK).json(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: false }) res: Response): Promise<void> {
    this.logger.log('POST /auth/refresh');

    const incomingToken: string | undefined = req.cookies?.refresh_token;
    if (!incomingToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { userId, newRefreshToken } = await this.refreshTokenUseCase.execute(incomingToken);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.signAccessToken(user);

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, newRefreshToken);

    res.status(HttpStatus.OK).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: false }) res: Response): Promise<void> {
    this.logger.log('POST /auth/logout');

    const incomingToken: string | undefined = req.cookies?.refresh_token;
    if (incomingToken) {
      await this.logoutUserUseCase.execute(incomingToken);
    }

    this.clearAuthCookies(res);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('me')
  async me(@CurrentUser() payload: CurrentUserPayload): Promise<CurrentUserPayload> {
    this.logger.log(`GET /auth/me - user: ${payload.id}`);
    const user = await this.userRepository.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  @Public()
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async confirmEmail(@Body() dto: ConfirmEmailDto): Promise<{ message: string }> {
    this.logger.log('POST /auth/confirm-email');
    try {
      await this.confirmEmailUseCase.execute(dto.token);
    } catch (error) {
      if (error instanceof InvalidVerificationTokenError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    return { message: 'Email confirmed successfully' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resendVerification(
    @CurrentUser() payload: CurrentUserPayload,
  ): Promise<{ message: string }> {
    this.logger.log(`POST /auth/resend-verification - user: ${payload.id}`);
    const user = await this.userRepository.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.sendVerificationEmailUseCase.execute(user);
    return { message: 'Verification email sent' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    this.logger.log(`POST /auth/forgot-password`);
    await this.requestPasswordResetUseCase.execute(dto.email);
    return { message: 'Si existe una cuenta con ese correo, recibirás un enlace.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    this.logger.log('POST /auth/reset-password');
    try {
      await this.resetPasswordUseCase.execute(dto.token, dto.password);
    } catch (error) {
      if (error instanceof InvalidResetTokenError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    return { message: 'Password reset successfully' };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async setAuthCookies(res: Response, user: UserEntity): Promise<void> {
    const accessToken = this.signAccessToken(user);
    const rawRefreshToken = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const now = new Date();

    await this.refreshTokenRepository.create(
      new RefreshTokenEntity({
        id: uuidv4(),
        tokenHash,
        userId: user.id,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
        revokedAt: null,
        createdAt: now,
      }),
    );

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, rawRefreshToken);
  }

  private signAccessToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private setAccessCookie(res: Response, accessToken: string): void {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'strict' });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/auth/refresh',
    });
  }
}
