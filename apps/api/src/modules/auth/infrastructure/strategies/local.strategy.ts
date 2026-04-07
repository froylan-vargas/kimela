import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UserEntity } from '../../../users/domain/user.entity';
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
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw error;
    }
  }
}
