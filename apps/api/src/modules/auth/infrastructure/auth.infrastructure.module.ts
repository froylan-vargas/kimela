import { Module } from '@nestjs/common';
import { REFRESH_TOKEN_REPOSITORY } from '../domain/refresh-token.repository';
import { PrismaRefreshTokenRepository } from './persistence/prisma-refresh-token.repository';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
} from '../domain/email-verification-token.repository';
import { PrismaEmailVerificationTokenRepository } from './persistence/prisma-email-verification-token.repository';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
} from '../domain/password-reset-token.repository';
import { PrismaPasswordResetTokenRepository } from './persistence/prisma-password-reset-token.repository';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { UsersInfrastructureModule } from '../../users/infrastructure/users.infrastructure.module';
import { EmailInfrastructureModule } from './email/email.infrastructure.module';

@Module({
  imports: [UsersInfrastructureModule, EmailInfrastructureModule],
  providers: [
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY,
      useClass: PrismaEmailVerificationTokenRepository,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PrismaPasswordResetTokenRepository,
    },
    LocalStrategy,
    JwtStrategy,
    LoginUserUseCase,
  ],
  exports: [
    REFRESH_TOKEN_REPOSITORY,
    EMAIL_VERIFICATION_TOKEN_REPOSITORY,
    PASSWORD_RESET_TOKEN_REPOSITORY,
    LoginUserUseCase,
    EmailInfrastructureModule,
  ],
})
export class AuthInfrastructureModule {}
