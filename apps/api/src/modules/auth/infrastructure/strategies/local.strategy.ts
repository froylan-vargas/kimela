import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UserEntity } from '../../../users/domain/user.entity';
import { EmailNotVerifiedError } from '../../domain/errors/email-not-verified.error';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly loginUserUseCase: LoginUserUseCase) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<UserEntity> {
    try {
      return await this.loginUserUseCase.execute(email, password);
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        throw new UnauthorizedException({
          message: 'Email not verified',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        });
      }
      throw error;
    }
  }
}
