import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../../../users/domain/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/user.repository';
import { UserRole } from '../../../users/domain/user-role.enum';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { RegisterDto } from '../dtos/register.dto';
import { SendVerificationEmailUseCase } from './send-verification-email.use-case';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class RegisterUserUseCase {

  constructor(
    @InjectPinoLogger(RegisterUserUseCase.name) private readonly logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly sendVerificationEmailUseCase: SendVerificationEmailUseCase,
  ) {}

  async execute(dto: RegisterDto): Promise<UserEntity> {
    this.logger.info(`Registering user with email: ${dto.email}`);

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();

    const entity = new UserEntity({
      id: uuidv4(),
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: UserRole.USER,
      emailVerifiedAt: null,
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    const user = await this.userRepository.create(entity);
    void this.sendVerificationEmailUseCase.execute(user)
      .catch(err => this.logger.error('Failed to send verification email', err));
    return user;
  }
}
