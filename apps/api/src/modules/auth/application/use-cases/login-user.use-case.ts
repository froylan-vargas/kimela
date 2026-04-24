import { Inject, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../../users/domain/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/user.repository';
import { EmailNotVerifiedError } from '../../domain/errors/email-not-verified.error';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';

@Injectable()
export class LoginUserUseCase {
  private readonly logger = new Logger(LoginUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(email: string, password: string): Promise<UserEntity> {
    this.logger.log(`Login attempt for email: ${email}`);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
    if (requireVerification && !user.emailVerifiedAt) {
      throw new EmailNotVerifiedError();
    }

    return user;
  }
}
