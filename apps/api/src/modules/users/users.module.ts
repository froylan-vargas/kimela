import { Module } from '@nestjs/common';
import { UsersInfrastructureModule } from './infrastructure/users.infrastructure.module';
import { UsersController } from './presentation/users.controller';
import { UploadAvatarUseCase } from './application/use-cases/upload-avatar.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { ImageKitService } from './infrastructure/imagekit.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [UsersInfrastructureModule, PrismaModule],
  controllers: [UsersController],
  providers: [UploadAvatarUseCase, UpdateProfileUseCase, ImageKitService],
  exports: [UsersInfrastructureModule],
})
export class UsersModule {}
