import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthInfrastructureModule } from '../infrastructure/auth.infrastructure.module';
import { UsersInfrastructureModule } from '../../users/infrastructure/users.infrastructure.module';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case';
import { SendVerificationEmailUseCase } from '../application/use-cases/send-verification-email.use-case';
import { ConfirmEmailUseCase } from '../application/use-cases/confirm-email.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      privateKey: process.env.JWT_PRIVATE_KEY,
      publicKey: process.env.JWT_PUBLIC_KEY,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '15m',
      },
    }),
    AuthInfrastructureModule,
    UsersInfrastructureModule,
  ],
  providers: [
    RegisterUserUseCase,
    RefreshTokenUseCase,
    LogoutUserUseCase,
    SendVerificationEmailUseCase,
    ConfirmEmailUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
