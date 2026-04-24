import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { UserEntity } from '../../domain/user.entity';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, name: string): Promise<UserEntity> {
    return this.userRepository.updateProfile(userId, { name });
  }
}
