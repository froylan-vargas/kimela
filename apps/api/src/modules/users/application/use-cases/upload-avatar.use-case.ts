import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { ImageKitService } from '../../infrastructure/imagekit.service';
import { UserEntity } from '../../domain/user.entity';

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly imageKitService: ImageKitService,
  ) {}

  async execute(userId: string, fileBuffer: Buffer, originalName: string): Promise<UserEntity> {
    const ext = originalName.split('.').pop() ?? 'jpg';
    const fileName = `avatar-${userId}-${Date.now()}.${ext}`;
    const imageUrl = await this.imageKitService.uploadAvatar(fileBuffer, fileName);
    return this.userRepository.updateProfile(userId, { imageUrl });
  }
}
